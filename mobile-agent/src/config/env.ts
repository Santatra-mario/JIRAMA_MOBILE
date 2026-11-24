/**
 * URL publique de l'API Express.
 * Sur un téléphone physique, utiliser l'IPv4 du PC (ipconfig), pas localhost
 * ni 10.0.2.2 qui est réservé à l'émulateur Android.
 */
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = configuredUrl
  ? configuredUrl.replace(/\/+$/, '')
  : null;

export const API_TIMEOUT_MS = 15000;

/**
 * Jours fÃ©riÃ©s configurÃ©s pour le calendrier local.
 * Aucun jour n'est prÃ©sumÃ© fÃ©riÃ© : ajouter uniquement les dates validÃ©es.
 * Format des dates : YYYY-MM-DD.
 */
export const JIRAMA_HOLIDAYS: Set<string> = new Set<string>();