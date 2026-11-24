/* Même règle que backend/src/utils/calendrierControle.js.
 * Jour 1 = préparation Web, Jour 2 = descente terrain, Jour 3 = contrôle/finalisation.
 * Le dimanche est non ouvrable ; les jours fériés supplémentaires sont
 * configurables par VITE_JIRAMA_JOURS_FERIES="YYYY-MM-DD,YYYY-MM-DD".
 */
const JOURS_FERIES = new Set(
  String(import.meta.env.VITE_JIRAMA_JOURS_FERIES || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
);

export function dateIso(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  }
  return String(value).slice(0, 10);
}

export function dateValide(value) {
  const iso = dateIso(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function ajouterJours(value, nombre) {
  const iso = dateIso(value);
  if (!dateValide(iso)) return '';
  const parsed = new Date(`${iso}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + nombre);
  return parsed.toISOString().slice(0, 10);
}

export function estJourOuvrable(value) {
  const iso = dateIso(value);
  if (!dateValide(iso) || JOURS_FERIES.has(iso)) return false;
  return new Date(`${iso}T00:00:00Z`).getUTCDay() !== 0;
}

export function prochainJourOuvrable(value, inclureDate = true) {
  let current = dateIso(value);
  if (!dateValide(current)) return '';
  if (!inclureDate) current = ajouterJours(current, 1);
  for (let i = 0; i < 370; i += 1) {
    if (estJourOuvrable(current)) return current;
    current = ajouterJours(current, 1);
  }
  return '';
}

export function construireCyclesControle(debutValue, finValue) {
  const debut = dateIso(debutValue);
  const fin = dateIso(finValue);
  if (!dateValide(debut) || !dateValide(fin) || fin < debut) return [];
  const cycles = [];
  let curseur = debut;
  for (let numero = 1; numero <= 124; numero += 1) {
    const preparation = prochainJourOuvrable(curseur);
    if (!preparation || preparation > fin) break;
    const descente = prochainJourOuvrable(preparation, false);
    const finalisation = prochainJourOuvrable(descente, false);
    if (!descente || !finalisation || finalisation > fin) break;
    cycles.push({ numero, preparation, descente, finalisation });
    curseur = ajouterJours(finalisation, 1);
  }
  return cycles;
}

export function trouverCycleControle(dateValue, debutValue, finValue) {
  const date = dateIso(dateValue);
  if (!dateValide(date)) return null;
  for (const cycle of construireCyclesControle(debutValue, finValue)) {
    if (date === cycle.preparation) return { ...cycle, jour: 1 };
    if (date === cycle.descente) return { ...cycle, jour: 2 };
    if (date === cycle.finalisation) return { ...cycle, jour: 3 };
  }
  return null;
}

export function jourDuCycleControle(dateValue, debutValue, finValue) {
  return trouverCycleControle(dateValue, debutValue, finValue)?.jour ?? null;
}

export function estDateTerrainControle(dateValue, debutValue, finValue) {
  const jour = jourDuCycleControle(dateValue, debutValue, finValue);
  return jour === 2 || jour === 3;
}

export function finDernierCycleControle(debutValue, finValue) {
  const cycles = construireCyclesControle(debutValue, finValue);
  return cycles.at(-1)?.finalisation || '';
}
