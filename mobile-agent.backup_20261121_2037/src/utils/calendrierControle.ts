
import { JIRAMA_HOLIDAYS } from '../config/env';

export type CycleControle = {
  numero: number;
  preparation: string;
  descente: string;
  finalisation: string;
};

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function addDays(value: string, count: number) {
  if (!isIsoDate(value)) return '';

  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);

  return date.toISOString().slice(0, 10);
}

function nextWorkingDay(value: string, include = true) {
  let cursor = include ? value : addDays(value, 1);

  for (let i = 0; i < 370; i += 1) {
    if (!isIsoDate(cursor)) return '';

    const weekday = new Date(`${cursor}T00:00:00Z`).getUTCDay();

    if (weekday !== 0 && !JIRAMA_HOLIDAYS.has(cursor)) {
      return cursor;
    }

    cursor = addDays(cursor, 1);
  }

  return '';
}

export function buildControlCycles(
  startValue?: string | null,
  endValue?: string | null
): CycleControle[] {
  const start = String(startValue || '').slice(0, 10);
  const end = String(endValue || '').slice(0, 10);

  if (!isIsoDate(start) || !isIsoDate(end) || end < start) {
    return [];
  }

  const cycles: CycleControle[] = [];
  let cursor = start;

  for (let number = 1; number <= 124; number += 1) {
    const preparation = nextWorkingDay(cursor, true);

    if (!preparation || preparation > end) break;

    const descent = nextWorkingDay(preparation, false);
    const finalization = nextWorkingDay(descent, false);

    if (!descent || !finalization || finalization > end) {
      break;
    }

    // Correction : association explicite avec la propriété française.
    cycles.push({
      numero: number,
      preparation,
      descente: descent,
      finalisation: finalization,
    });

    cursor = addDays(finalization, 1);
  }

  return cycles;
}

export function findMissionCycle(mission: {
  date_prevue?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
}) {
  const planned = String(mission.date_prevue || '').slice(0, 10);

  const cycle = buildControlCycles(
    mission.date_debut,
    mission.date_fin
  ).find(
    (item) =>
      item.descente === planned ||
      item.finalisation === planned
  );

  if (!cycle) return null;

  return {
    ...cycle,
    day: cycle.descente === planned ? 2 : 3,
  };
}

export function getLocalDateISO() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateFr(value?: string | null) {
  if (!value) return 'Non renseignée';

  const iso = String(value).slice(0, 10);

  if (!isIsoDate(iso)) return 'Date invalide';

  const [year, month, day] = iso.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
