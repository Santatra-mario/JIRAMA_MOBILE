'use strict';

/*
=========================================================
RÈGLES TECHNIQUES DE DÉTECTION DES ANOMALIES
=========================================================

Ces seuils sont des règles internes au projet, utilisées pour
classer une variation de consommation. Ils ne constituent PAS une
norme officielle JIRAMA et ne prouvent jamais une fraude : ils
produisent une alerte à vérifier par les personnes habilitées.

Les valeurs par défaut reprennent exactement les seuils déjà
codés dans les contrôleurs (50 / 75 / 100) afin de ne pas modifier
le comportement existant.

Surcharge possible via l'environnement, pour validation par le
Responsable métier :
  JIRAMA_SEUIL_ANOMALIE  (défaut 50)
  JIRAMA_SEUIL_SUSPECTE  (défaut 75)
  JIRAMA_SEUIL_CRITIQUE  (défaut 100)

Une configuration incohérente (seuils non croissants ou non
numériques) est ignorée au profit des valeurs par défaut, avec un
avertissement dans les logs : aucune requête SQL ne peut ainsi
recevoir une valeur non numérique.
=========================================================
*/

const DEFAUTS = Object.freeze({
  anomalie: 50,
  suspecte: 75,
  critique: 100,
  relevesReference: 3,
});

function lireSeuil(nom, defaut) {
  const brut = process.env[nom];

  if (brut === undefined || String(brut).trim() === '') {
    return defaut;
  }

  const valeur = Number(brut);

  if (!Number.isFinite(valeur) || valeur <= 0) {
    console.warn(
      `[reglesDetection] ${nom} invalide (${brut}) : valeur par défaut ${defaut} conservée.`
    );
    return defaut;
  }

  return valeur;
}

let SEUIL_ANOMALIE = lireSeuil('JIRAMA_SEUIL_ANOMALIE', DEFAUTS.anomalie);
let SEUIL_SUSPECTE = lireSeuil('JIRAMA_SEUIL_SUSPECTE', DEFAUTS.suspecte);
let SEUIL_CRITIQUE = lireSeuil('JIRAMA_SEUIL_CRITIQUE', DEFAUTS.critique);

if (
  !(SEUIL_ANOMALIE <= SEUIL_SUSPECTE && SEUIL_SUSPECTE <= SEUIL_CRITIQUE)
) {
  console.warn(
    '[reglesDetection] Seuils non croissants : valeurs par défaut 50/75/100 rétablies.'
  );
  SEUIL_ANOMALIE = DEFAUTS.anomalie;
  SEUIL_SUSPECTE = DEFAUTS.suspecte;
  SEUIL_CRITIQUE = DEFAUTS.critique;
}

const NOMBRE_RELEVES_REFERENCE = DEFAUTS.relevesReference;

/**
 * Niveau d'alerte d'une variation en pourcentage.
 * @param {number|string} variation
 * @returns {'CRITIQUE'|'SUSPECTE'|'ATTENTION'|null}
 */
function niveauDepuisVariation(variation) {
  const valeur = Number(variation);

  if (!Number.isFinite(valeur)) {
    return null;
  }

  const absolue = Math.abs(valeur);

  if (absolue >= SEUIL_CRITIQUE) return 'CRITIQUE';
  if (absolue >= SEUIL_SUSPECTE) return 'SUSPECTE';

  return 'ATTENTION';
}

/**
 * Une variation est-elle au-delà du seuil de suivi ?
 * @param {number|string} variation
 */
function variationSignificative(variation) {
  const valeur = Number(variation);

  return Number.isFinite(valeur) && Math.abs(valeur) >= SEUIL_ANOMALIE;
}

module.exports = {
  SEUIL_ANOMALIE,
  SEUIL_SUSPECTE,
  SEUIL_CRITIQUE,
  NOMBRE_RELEVES_REFERENCE,
  niveauDepuisVariation,
  variationSignificative,
};
