
import { apiRequest } from './apiClient';

import type {
  AgentMission,
  AgentReleve,
  AgentCompteur,
} from '../types/agent';

/* =========================================================
   TYPES API
========================================================= */

type ApiRecord = Record<string, unknown>;

export type AgentNotification = {
  id: number | string;
  statut?: string;
  type?: string;
  sujet?: string;
  message?: string;
  created_at?: string;
  date_envoi?: string | null;
  mission_id?: number | string | null;
  numero_compteur?: string | number | null;
  numero_abonne?: string | number | null;
  type_anomalie?: string | null;
  niveau?: string | null;
  [key: string]: any;
};

export type AgentNotificationSnapshot = {
  items: AgentNotification[];
  unreadCount: number;
  total: number;
  [key: string]: unknown;
};

/* =========================================================
   OUTILS DE VALIDATION ET NORMALISATION
========================================================= */

/**
 * Vérifie si une valeur est un objet exploitable.
 */
function isRecord(value: unknown): value is ApiRecord {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * Vérifie et convertit un identifiant.
 */
function requireId(
  id: number | string,
  label: string
): number {
  const value = Number(id);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} invalide.`);
  }

  return value;
}

/**
 * Clés utilisées pour retrouver les tableaux
 * dans les différentes réponses possibles du backend.
 */
const LIST_KEYS = [
  'data',
  'items',
  'rows',
  'results',
  'records',
  'list',
  'missions',
  'compteurs',
  'releves',
  'notifications',
  'anomalies',
] as const;

/**
 * Recherche un tableau dans une réponse API.
 *
 * Formats acceptés :
 * - [...]
 * - { data: [...] }
 * - { items: [...] }
 * - { rows: [...] }
 * - { results: [...] }
 * - { compteurs: [...] }
 * - { releves: [...] }
 * - { data: { items: [...] } }
 * - { data: { data: [...] } }
 *
 * La fonction distingue un tableau vide d'une réponse
 * qui ne contient aucun tableau.
 */
function findList<T>(
  response: unknown,
  depth = 0
): T[] | undefined {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (!isRecord(response) || depth > 5) {
    return undefined;
  }

  for (const key of LIST_KEYS) {
    if (!(key in response)) {
      continue;
    }

    const candidate = response[key];

    if (Array.isArray(candidate)) {
      return candidate as T[];
    }

    if (isRecord(candidate)) {
      const nested = findList<T>(candidate, depth + 1);

      if (nested !== undefined) {
        return nested;
      }
    }
  }

  return undefined;
}

/**
 * Normalise une réponse API en tableau.
 * Renvoie toujours un tableau, même si le backend
 * retourne une réponse vide ou inattendue.
 */
function extractList<T>(response: unknown): T[] {
  return findList<T>(response) ?? [];
}

/**
 * Recherche une valeur numérique dans la réponse API.
 * Les métadonnées peuvent être directement à la racine
 * ou dans un objet data, meta ou pagination.
 */
function findNumber(
  response: unknown,
  field: string,
  depth = 0
): number | undefined {
  if (!isRecord(response) || depth > 4) {
    return undefined;
  }

  const value = response[field];

  if (value !== undefined && value !== null && value !== '') {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  const nestedKeys = [
    'data',
    'meta',
    'pagination',
    'result',
  ];

  for (const key of nestedKeys) {
    const nested = response[key];

    if (isRecord(nested)) {
      const found = findNumber(nested, field, depth + 1);

      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * Vérifie si une notification est non lue.
 */
function isNotificationUnread(
  notification: AgentNotification
): boolean {
  return (
    String(notification?.statut || '').toUpperCase() ===
    'EN_ATTENTE'
  );
}

/* =========================================================
   MISSIONS AGENT
========================================================= */

/**
 * Récupérer toutes les missions de l'agent.
 */
export async function fetchAgentMissions(): Promise<AgentMission[]> {
  const response = await apiRequest<unknown>(
    '/agent/missions'
  );

  return extractList<AgentMission>(response);
}

/**
 * Récupérer les détails d'une mission.
 */
export async function fetchAgentMission(
  id: number
): Promise<AgentMission> {
  const missionId = requireId(
    id,
    'Identifiant de mission'
  );

  const response = await apiRequest<unknown>(
    `/agent/missions/${missionId}`
  );

  if (isRecord(response)) {
    const data = response.data;
    const mission = response.mission;
    const item = response.item;

    const candidates = [
      isRecord(data) ? data.mission : undefined,
      isRecord(data) ? data.data : undefined,
      data,
      mission,
      item,
      response,
    ];

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate as unknown as AgentMission;
      }
    }

    if (typeof response.message === 'string') {
      throw new Error(response.message);
    }
  }

  throw new Error('Détail de mission indisponible.');
}

/**
 * Démarrer une mission.
 */
export async function startAgentMission(
  id: number
): Promise<void> {
  const missionId = requireId(
    id,
    'Identifiant de mission'
  );

  await apiRequest(
    `/agent/missions/${missionId}/statut`,
    {
      method: 'PATCH',
      body: {
        statut: 'EN_COURS',
      },
    }
  );
}

/**
 * Signaler une visite infructueuse.
 */
export async function reportUnsuccessfulVisit(
  id: number,
  resultatVisite: string,
  motif: string
): Promise<void> {
  const missionId = requireId(
    id,
    'Identifiant de mission'
  );

  await apiRequest(
    `/agent/missions/${missionId}/statut`,
    {
      method: 'PATCH',
      body: {
        statut: 'A_REPROGRAMMER',
        motif,
        resultat_visite: resultatVisite,
        date_visite_reelle: localDateString(),
      },
    }
  );
}

/* =========================================================
   TABLEAU DE BORD AGENT
========================================================= */

/**
 * Récupérer les statistiques du tableau de bord.
 *
 * La structure est conservée pour ne pas modifier
 * les écrans qui utilisent directement ces données.
 */
export async function fetchAgentDashboard(): Promise<any> {
  return apiRequest<any>('/agent/dashboard');
}

/* =========================================================
   ABONNÉS
========================================================= */

/**
 * Récupérer les abonnés accessibles à l'agent.
 */
export async function fetchAgentAbonnes(): Promise<any> {
  return apiRequest<any>('/agent/abonnes');
}

/* =========================================================
   COMPTEURS
========================================================= */

/**
 * Récupérer les compteurs de l'agent.
 *
 * IMPORTANT :
 * Cette fonction renvoie toujours un tableau.
 */
export async function fetchAgentCompteurs(): Promise<AgentCompteur[]> {
  const response = await apiRequest<unknown>(
    '/agent/compteurs'
  );

  return extractList<AgentCompteur>(response);
}

/**
 * Créer un compteur.
 */
export async function createAgentCompteur(
  payload: Record<string, any>
): Promise<any> {
  return apiRequest<any>('/compteurs', {
    method: 'POST',
    body: payload,
  });
}

/* =========================================================
   RELEVÉS
========================================================= */

/**
 * Créer un relevé d'index.
 */
export async function createAgentReleve(payload: {
  mission_id: number;
  compteur_id: number;
  nouvel_index: number;
  date_visite_reelle: string;
  observation?: string | null;
}): Promise<any> {
  return apiRequest<any>('/agent/releves', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Modifier un relevé.
 */
export async function updateAgentReleve(
  id: number | string,
  payload: Record<string, any>
): Promise<any> {
  const releveId = requireId(
    id,
    'Identifiant de relevé'
  );

  return apiRequest<any>(
    `/agent/releves/${releveId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

/**
 * Récupérer les relevés.
 *
 * Cette fonction renvoie toujours AgentReleve[].
 */
export async function fetchAgentReleves(): Promise<AgentReleve[]> {
  const response = await apiRequest<unknown>(
    '/agent/releves'
  );

  return extractList<AgentReleve>(response);
}

/* =========================================================
   ANOMALIES
========================================================= */

/**
 * Récupérer les anomalies de l'agent.
 *
 * La réponse brute est conservée pour respecter
 * les écrans qui utilisent sa structure actuelle.
 */
export async function fetchAgentAnomalies(): Promise<any> {
  return apiRequest<any>('/agent/anomalies');
}

/* =========================================================
   NOTIFICATIONS AGENT
========================================================= */

/**
 * Récupérer et normaliser les notifications.
 *
 * La fonction renvoie toujours :
 * {
 *   items: [],
 *   unreadCount: 0,
 *   total: 0
 * }
 *
 * Elle accepte les différentes structures de réponse
 * que le backend peut retourner.
 */
export async function fetchAgentNotifications(): Promise<AgentNotificationSnapshot> {
  const response = await apiRequest<unknown>(
    '/agent/notifications'
  );

  const items = extractList<AgentNotification>(response);

  const calculatedUnread = items.filter(
    isNotificationUnread
  ).length;

  const serverUnread = findNumber(
    response,
    'unreadCount'
  );

  const serverTotal = findNumber(
    response,
    'total'
  );

  const metadata = isRecord(response)
    ? response
    : {};

  return {
    ...metadata,

    items,

    unreadCount:
      serverUnread !== undefined
        ? serverUnread
        : calculatedUnread,

    total:
      serverTotal !== undefined
        ? serverTotal
        : items.length,
  };
}

/**
 * Version détaillée du snapshot des notifications.
 *
 * Conservée pour les écrans qui utilisent cette fonction.
 */
export async function fetchAgentNotificationSnapshot(): Promise<AgentNotificationSnapshot> {
  return fetchAgentNotifications();
}

/**
 * Marquer une notification comme lue.
 */
export async function markAgentNotificationAsRead(
  id: number | string
): Promise<any> {
  const notificationId = requireId(
    id,
    'Identifiant de notification'
  );

  return apiRequest<any>(
    `/agent/notifications/${notificationId}/lue`,
    {
      method: 'PATCH',
    }
  );
}

/**
 * Marquer toutes les notifications comme lues.
 */
export async function markAllAgentNotificationsAsRead(): Promise<any> {
  return apiRequest<any>(
    '/agent/notifications/lire-tout',
    {
      method: 'PATCH',
    }
  );
}

/**
 * Archiver une notification.
 */
export async function archiveAgentNotification(
  id: number | string
): Promise<any> {
  const notificationId = requireId(
    id,
    'Identifiant de notification'
  );

  return apiRequest<any>(
    `/notifications/${notificationId}/archiver`,
    {
      method: 'PATCH',
    }
  );
}

/**
 * Supprimer une notification.
 */
export async function deleteAgentNotification(
  id: number | string
): Promise<any> {
  const notificationId = requireId(
    id,
    'Identifiant de notification'
  );

  return apiRequest<any>(
    `/notifications/${notificationId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Récupérer les notifications archivées.
 */
export async function fetchAgentArchivedNotifications(): Promise<any> {
  return apiRequest<any>(
    '/notifications?vue=archivees'
  );
}

/* =========================================================
   PARAMÈTRES ET PROFIL AGENT
========================================================= */

/**
 * Récupérer les paramètres de l'agent.
 */
export async function fetchAgentSettings(): Promise<any> {
  return apiRequest<any>('/settings');
}

/**
 * Enregistrer les préférences de l'agent.
 */
export async function saveAgentPreferences(
  preferences: Record<string, any>
): Promise<any> {
  return apiRequest<any>(
    '/settings/preferences',
    {
      method: 'PATCH',
      body: preferences,
    }
  );
}

/**
 * Modifier le profil de l'agent.
 */
export async function saveAgentProfile(
  profile: Record<string, any>
): Promise<any> {
  return apiRequest<any>(
    '/settings/profile',
    {
      method: 'PATCH',
      body: profile,
    }
  );
}

/**
 * Changer le mot de passe de l'agent.
 */
export async function changeAgentPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<any> {
  return apiRequest<any>(
    '/settings/password',
    {
      method: 'PATCH',
      body: payload,
    }
  );
}

/* =========================================================
   JOURNAL D'ACTIVITÉ PERSONNEL
========================================================= */

/**
 * Récupérer le journal d'activité personnel.
 */
export async function fetchAgentAuditLogs(): Promise<any> {
  return apiRequest<any>('/settings/audit');
}

/* =========================================================
   DATE LOCALE
========================================================= */

/**
 * Retourne une date au format YYYY-MM-DD
 * selon la date locale de l'appareil.
 */
export function localDateString(
  date: Date = new Date()
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
