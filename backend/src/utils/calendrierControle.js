'use strict';

/*
 * Calendrier du cycle de contrôle du projet JIRAMA Antsirabe.
 * Un cycle contient trois journées ouvrables distinctes :
 * 1 = préparation Web ; 2 = descente terrain ; 3 = contrôle et finalisation.
 * Le dimanche est non ouvrable par défaut. Les jours fériés locaux peuvent
 * être ajoutés dans JIRAMA_JOURS_FERIES (liste YYYY-MM-DD séparée par des virgules).
 * Les dates restent des chaînes ISO pour éviter les décalages de fuseau horaire.
 */

const JOURS_FERIES = new Set(
  String(process.env.JIRAMA_JOURS_FERIES || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
);

function dateIso(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }
  return String(value).slice(0, 10);
}

function dateValide(value) {
  const iso = dateIso(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function ajouterJours(value, nombre) {
  const iso = dateIso(value);
  if (!dateValide(iso)) return '';
  const parsed = new Date(`${iso}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + nombre);
  return parsed.toISOString().slice(0, 10);
}

function estJourOuvrable(value, joursFeries = JOURS_FERIES) {
  const iso = dateIso(value);
  if (!dateValide(iso) || joursFeries.has(iso)) return false;
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return weekday !== 0; // dimanche uniquement par défaut
}

function prochainJourOuvrable(value, options = {}) {
  const { inclureDate = true, joursFeries = JOURS_FERIES } = options;
  let current = dateIso(value);
  if (!dateValide(current)) return '';
  if (!inclureDate) current = ajouterJours(current, 1);
  for (let i = 0; i < 370; i += 1) {
    if (estJourOuvrable(current, joursFeries)) return current;
    current = ajouterJours(current, 1);
  }
  return '';
}

function construireCycles(debutValue, finValue, options = {}) {
  const debut = dateIso(debutValue);
  const fin = dateIso(finValue);
  const { joursFeries = JOURS_FERIES } = options;
  if (!dateValide(debut) || !dateValide(fin) || fin < debut) return [];

  const cycles = [];
  let curseur = debut;
  for (let numero = 1; numero <= 124; numero += 1) {
    const preparation = prochainJourOuvrable(curseur, { joursFeries });
    if (!preparation || preparation > fin) break;
    const descente = prochainJourOuvrable(preparation, { inclureDate: false, joursFeries });
    const finalisation = prochainJourOuvrable(descente, { inclureDate: false, joursFeries });
    if (!descente || !finalisation || finalisation > fin) break;

    cycles.push({ numero, preparation, descente, finalisation });
    curseur = ajouterJours(finalisation, 1);
  }
  return cycles;
}

function trouverCyclePourDate(dateValue, debutValue, finValue, options = {}) {
  const date = dateIso(dateValue);
  if (!dateValide(date)) return null;
  const cycles = construireCycles(debutValue, finValue, options);
  for (const cycle of cycles) {
    if (date === cycle.preparation) return { ...cycle, jour: 1 };
    if (date === cycle.descente) return { ...cycle, jour: 2 };
    if (date === cycle.finalisation) return { ...cycle, jour: 3 };
  }
  return null;
}

function jourDuCycle(dateValue, debutValue, finValue, options = {}) {
  return trouverCyclePourDate(dateValue, debutValue, finValue, options)?.jour ?? null;
}

function estJourTerrain(dateValue, debutValue, finValue, options = {}) {
  const jour = jourDuCycle(dateValue, debutValue, finValue, options);
  return jour === 2 || jour === 3;
}

function periodeCyclesValide(debutValue, finValue, options = {}) {
  return construireCycles(debutValue, finValue, options).length > 0;
}

function prochainCycleTerrain(debutValue, finValue, aujourdhuiValue, options = {}) {
  const aujourdhui = dateIso(aujourdhuiValue);
  const cycles = construireCycles(debutValue, finValue, options);
  return cycles.find((cycle) => cycle.descente >= aujourdhui)
    || cycles.find((cycle) => cycle.finalisation >= aujourdhui)
    || null;
}

module.exports = {
  JOURS_FERIES,
  dateIso,
  dateValide,
  ajouterJours,
  estJourOuvrable,
  prochainJourOuvrable,
  construireCycles,
  trouverCyclePourDate,
  jourDuCycle,
  estJourTerrain,
  periodeCyclesValide,
  prochainCycleTerrain,
};
