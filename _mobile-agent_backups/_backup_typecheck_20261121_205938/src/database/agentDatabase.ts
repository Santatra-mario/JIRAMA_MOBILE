import * as SQLite from 'expo-sqlite';

export type PendingOperationType = 'READING' | 'VISIT_RESULT';
export type PendingOperationStatus = 'PENDING' | 'SYNCED' | 'REJECTED' | 'CONFLICT';

export type PendingOperation = {
  local_id: string;
  mission_id: string;
  owner_agent_id: string | null;
  operation_type: PendingOperationType;
  payload_json: string;
  created_at: string;
  sync_status: PendingOperationStatus;
  last_error: string | null;
  server_id: string | null;
};

/* Checklist de préparation du Jour 1 — neuf points demandés.
   Elle reste locale à SQLite : aucune route backend ne la valide. */
export type PreparationChecklist = {
  missionChecked: boolean;
  subscribersChecked: boolean;
  metersChecked: boolean;
  previousIndexChecked: boolean;
  instructionsChecked: boolean;
  dataDownloaded: boolean;
  equipmentPrepared: boolean;
  visitsOrganized: boolean;
  missingInfoChecked: boolean;
};

export type SyncLogEntry = {
  log_id: string;
  owner_agent_id: string | null;
  started_at: string;
  finished_at: string | null;
  success_count: number;
  failed_count: number;
  message: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let schemaReady: Promise<void> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('jirama_agent_local.db');
  }
  return databasePromise;
}

/**
 * Migration strictement additive : CREATE TABLE / INDEX IF NOT EXISTS.
 * Aucune table locale existante n'est supprimée ou vidée.
 */
export async function initializeAgentDatabase() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = await getDatabase();
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS agent_cached_missions (
          mission_id TEXT PRIMARY KEY NOT NULL,
          owner_agent_id TEXT NULL,
          payload_json TEXT NOT NULL,
          cached_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_preparation_checklist (
          mission_id TEXT PRIMARY KEY NOT NULL,
          owner_agent_id TEXT NULL,
          checklist_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_pending_operations (
          local_id TEXT PRIMARY KEY NOT NULL,
          mission_id TEXT NOT NULL UNIQUE,
          owner_agent_id TEXT NULL,
          operation_type TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'PENDING',
          last_error TEXT NULL,
          server_id TEXT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_agent_pending_status
          ON agent_pending_operations(sync_status, created_at);

        CREATE TABLE IF NOT EXISTS agent_sync_log (
          log_id TEXT PRIMARY KEY NOT NULL,
          owner_agent_id TEXT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT NULL,
          success_count INTEGER NOT NULL DEFAULT 0,
          failed_count INTEGER NOT NULL DEFAULT 0,
          message TEXT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_agent_sync_log_owner
          ON agent_sync_log(owner_agent_id, started_at);
      `);

      // Migration additive pour une base créée par une version précédente :
      // on ajoute les colonnes si elles manquent, sans supprimer de ligne/table.
      const ensureColumn = async (table: string, column: string) => {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
        if (!columns.some((item) => item.name === column)) {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NULL;`);
        }
      };
      await ensureColumn('agent_cached_missions', 'owner_agent_id');
      await ensureColumn('agent_preparation_checklist', 'owner_agent_id');
      await ensureColumn('agent_pending_operations', 'owner_agent_id');
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_agent_cache_owner
          ON agent_cached_missions(owner_agent_id, cached_at);
        CREATE INDEX IF NOT EXISTS idx_agent_pending_owner
          ON agent_pending_operations(owner_agent_id, sync_status, created_at);
        CREATE INDEX IF NOT EXISTS idx_agent_checklist_owner
          ON agent_preparation_checklist(owner_agent_id, updated_at);
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function cacheAgentMissions(missions: Array<Record<string, any>>, agentId: number | string) {
  await initializeAgentDatabase();
  const db = await getDatabase();
  const now = new Date().toISOString();

  for (const mission of missions) {
    if (mission?.id === undefined || mission?.id === null) continue;
    await db.runAsync(
      `INSERT INTO agent_cached_missions (mission_id, owner_agent_id, payload_json, cached_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(mission_id) DO UPDATE SET
         owner_agent_id = excluded.owner_agent_id,
         payload_json = excluded.payload_json,
         cached_at = excluded.cached_at`,
      String(mission.id),
      String(agentId),
      JSON.stringify(mission),
      now,
    );
  }
}

export async function getCachedAgentMissions(agentId: number | string): Promise<Array<Record<string, any>>> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload_json: string }>(
    'SELECT payload_json FROM agent_cached_missions WHERE owner_agent_id = ? ORDER BY cached_at DESC',
    String(agentId),
  );
  return rows.flatMap((row) => {
    try {
      const parsed = JSON.parse(row.payload_json);
      return parsed && typeof parsed === 'object' ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

export async function cacheAgentMission(mission: Record<string, any>, agentId: number | string) {
  return cacheAgentMissions([mission], agentId);
}

export async function getPreparationChecklist(missionId: number | string, agentId: number | string): Promise<PreparationChecklist> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ checklist_json: string }>(
    'SELECT checklist_json FROM agent_preparation_checklist WHERE mission_id = ? AND owner_agent_id = ?',
    String(missionId),
    String(agentId),
  );
  const empty: PreparationChecklist = {
    missionChecked: false,
    subscribersChecked: false,
    metersChecked: false,
    previousIndexChecked: false,
    instructionsChecked: false,
    dataDownloaded: false,
    equipmentPrepared: false,
    visitsOrganized: false,
    missingInfoChecked: false,
  };
  if (!row) return empty;
  try {
    return { ...empty, ...JSON.parse(row.checklist_json) };
  } catch {
    return empty;
  }
}

export async function savePreparationChecklist(
  missionId: number | string,
  checklist: PreparationChecklist,
  agentId: number | string,
) {
  await initializeAgentDatabase();
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO agent_preparation_checklist (mission_id, owner_agent_id, checklist_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(mission_id) DO UPDATE SET
       owner_agent_id = excluded.owner_agent_id,
       checklist_json = excluded.checklist_json,
       updated_at = excluded.updated_at`,
    String(missionId),
    String(agentId),
    JSON.stringify(checklist),
    new Date().toISOString(),
  );
}

function createLocalId() {
  return `agent-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export async function savePendingOperation(
  missionId: number | string,
  operationType: PendingOperationType,
  payload: Record<string, any>,
  agentId: number | string,
): Promise<PendingOperation> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  const missionKey = String(missionId);
  const existing = await db.getFirstAsync<PendingOperation>(
    'SELECT * FROM agent_pending_operations WHERE mission_id = ?',
    missionKey,
  );

  if (existing) {
    if (String(existing.owner_agent_id || '') !== String(agentId)) {
      throw new Error('Cette mission possède une opération locale associée à un autre compte Agent. Les données sont conservées et ne seront pas transmises avec cette session.');
    }
    if (existing.operation_type !== operationType) {
      throw new Error('Une autre opération est déjà en attente pour cette mission. Synchronisez-la avant de poursuivre.');
    }
    if (existing.payload_json !== JSON.stringify(payload)) {
      throw new Error('Une opération existe déjà pour cette mission avec un contenu différent. Elle ne sera pas écrasée : synchronisez-la ou faites vérifier le conflit.');
    }
    return existing;
  }

  const localId = createLocalId();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO agent_pending_operations
      (local_id, mission_id, owner_agent_id, operation_type, payload_json, created_at, sync_status, last_error, server_id)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL)`,
    localId,
    missionKey,
    String(agentId),
    operationType,
    JSON.stringify(payload),
    createdAt,
  );

  const inserted = await db.getFirstAsync<PendingOperation>(
    'SELECT * FROM agent_pending_operations WHERE local_id = ?',
    localId,
  );
  if (!inserted) throw new Error('Impossible de retrouver l’opération locale créée.');
  return inserted;
}

export async function getPendingOperations(agentId: number | string): Promise<PendingOperation[]> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  return db.getAllAsync<PendingOperation>(
    `SELECT * FROM agent_pending_operations
     WHERE owner_agent_id = ? AND sync_status = 'PENDING'
     ORDER BY created_at ASC`,
    String(agentId),
  );
}

export async function getAllLocalOperations(agentId: number | string): Promise<PendingOperation[]> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  return db.getAllAsync<PendingOperation>(
    'SELECT * FROM agent_pending_operations WHERE owner_agent_id = ? ORDER BY created_at DESC',
    String(agentId),
  );
}

export async function saveSyncLog(
  agentId: number | string,
  successCount: number,
  failedCount: number,
  message: string | null,
) {
  await initializeAgentDatabase();
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO agent_sync_log
      (log_id, owner_agent_id, started_at, finished_at, success_count, failed_count, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    `sync-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    String(agentId),
    now,
    now,
    Math.max(0, Number(successCount) || 0),
    Math.max(0, Number(failedCount) || 0),
    message,
  );
}

export async function getRecentSyncLogs(
  agentId: number | string,
  limit = 10,
): Promise<SyncLogEntry[]> {
  await initializeAgentDatabase();
  const db = await getDatabase();
  return db.getAllAsync<SyncLogEntry>(
    'SELECT * FROM agent_sync_log WHERE owner_agent_id = ? ORDER BY started_at DESC LIMIT ?',
    String(agentId),
    Math.max(1, Math.floor(Number(limit) || 10)),
  );
}

export async function updatePendingOperation(
  localId: string,
  status: PendingOperationStatus,
  lastError: string | null = null,
  serverId: string | number | null = null,
) {
  await initializeAgentDatabase();
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE agent_pending_operations
     SET sync_status = ?, last_error = ?, server_id = COALESCE(?, server_id)
     WHERE local_id = ?`,
    status,
    lastError,
    serverId === null ? null : String(serverId),
    localId,
  );
}
