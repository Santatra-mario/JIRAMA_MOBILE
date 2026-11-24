'use strict';

const assert = require('node:assert/strict');
const calendrier = require('../src/utils/calendrierControle');

// Vérifie un cycle qui traverse un dimanche : celui-ci est sauté par le calendrier.
const debut = '2026-11-27'; // vendredi : Jour 1
const fin = '2026-12-04';
const cycles = calendrier.construireCycles(debut, fin);

assert.ok(cycles.length >= 1, 'Un cycle complet doit être construit.');
assert.equal(cycles[0].preparation, '2026-11-27');
assert.equal(cycles[0].descente, '2026-11-28');
assert.equal(cycles[0].finalisation, '2026-11-30');
assert.equal(calendrier.trouverCyclePourDate(cycles[0].preparation, debut, fin).jour, 1);
assert.equal(calendrier.trouverCyclePourDate(cycles[0].descente, debut, fin).jour, 2);
assert.equal(calendrier.trouverCyclePourDate(cycles[0].finalisation, debut, fin).jour, 3);
assert.equal(calendrier.trouverCyclePourDate('2026-11-29', debut, fin), null);

console.log('OK — Jour 1 Web, Jour 2 descente, Jour 3 contrôle/finalisation ; dimanche exclu.');
