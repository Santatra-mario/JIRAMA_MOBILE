import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env';

/**
 * Les chemins ci-dessous correspondent aux routes réellement montées par
 * backend/server.js et backend/src/routes/agentRoutes.js dans l'archive.
 * API_BASE_URL doit déjà se terminer par /api.
 */
export const API_PATHS = {
  health: '/health',
  databaseHealth: '/health/db',
  login: '/auth/login',
  agentMissions: '/agent/missions',
  agentMission: (id: number | string) => `/agent/missions/${encodeURIComponent(String(id))}`,
  agentMissionStatus: (id: number | string) => `/agent/missions/${encodeURIComponent(String(id))}/statut`,
  agentReadings: '/agent/releves',
  /* Périmètre serveur : anomalies de ses missions ou de ses propres relevés. */
  agentAnomalies: '/agent/anomalies',
  agentNotifications: '/agent/notifications',
  agentNotificationCount: '/agent/notifications/count',
  agentNotificationRead: (id: number | string) => `/agent/notifications/${encodeURIComponent(String(id))}/lue`,
  agentNotificationsReadAll: '/agent/notifications/lire-tout',
} as const;

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!API_BASE_URL) {
    throw new Error(
      'URL API non configurée. Créez mobile-agent/.env et renseignez EXPO_PUBLIC_API_URL avec l’adresse IP du PC et le port 5000.',
    );
  }

  if (!client) {
    client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  return client;
}

function authConfig(token?: string) {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
}

export async function apiGet<T = any>(path: string, token?: string): Promise<T> {
  const response = await getClient().get<T>(path, authConfig(token));
  return response.data;
}

export async function apiPost<T = any>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await getClient().post<T>(path, body, authConfig(token));
  return response.data;
}

export async function apiPatch<T = any>(path: string, body: unknown, token: string): Promise<T> {
  const response = await getClient().patch<T>(path, body, authConfig(token));
  return response.data;
}

export async function apiPut<T = any>(path: string, body: unknown, token: string): Promise<T> {
  const response = await getClient().put<T>(path, body, authConfig(token));
  return response.data;
}

export async function checkApiHealth(): Promise<{
  apiAvailable: boolean;
  databaseAvailable: boolean;
  apiMessage: string;
  databaseMessage: string;
}> {
  if (!API_BASE_URL) {
    return {
      apiAvailable: false,
      databaseAvailable: false,
      apiMessage: 'URL API non configurée.',
      databaseMessage: 'PostgreSQL non vérifié.',
    };
  }

  let apiAvailable = false;
  let databaseAvailable = false;
  let apiMessage = 'API inaccessible.';
  let databaseMessage = 'PostgreSQL non vérifié.';

  try {
    const response = await getClient().get(API_PATHS.health);
    apiAvailable = response.status === 200 && response.data?.status === 'success';
    apiMessage = response.data?.message || 'Backend disponible.';
  } catch (error) {
    apiMessage = getApiErrorMessage(error, 'Impossible de joindre le backend.');
  }

  if (apiAvailable) {
    try {
      const response = await getClient().get(API_PATHS.databaseHealth);
      databaseAvailable = response.status === 200 && response.data?.status === 'success';
      databaseMessage = response.data?.database || 'PostgreSQL connecté.';
    } catch (error) {
      databaseMessage = getApiErrorMessage(error, 'Backend joignable, mais PostgreSQL non vérifié.');
    }
  }

  return { apiAvailable, databaseAvailable, apiMessage, databaseMessage };
}

export function extractData<T>(response: any): T | null {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data as T;
  }
  return null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.response?.data?.error;
    if (typeof message === 'string' && message.trim()) return message;
    if (error.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.';
    if (!error.response) return 'Impossible de joindre le serveur. Vérifiez le Wi-Fi, l’adresse IP et le pare-feu Windows.';
    return `${fallback} (HTTP ${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isNetworkOrServerError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500;
}

export function getHttpStatus(error: unknown): number | null {
  return axios.isAxiosError(error) ? error.response?.status ?? null : null;
}

export function isAxiosResponse(value: unknown): value is AxiosResponse {
  return Boolean(value && typeof value === 'object' && 'status' in value && 'data' in value);
}

export function isAxiosError(value: unknown): value is AxiosError {
  return axios.isAxiosError(value);
}
