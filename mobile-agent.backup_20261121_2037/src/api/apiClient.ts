import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env';
import { getStoredToken } from '../auth/secureStorage';

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export class ApiError extends Error {
  status: number | null;
  data: any;

  constructor(message: string, status: number | null = null, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  token?: string;
  timeoutMs?: number;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "L'adresse de l'API n'est pas configurée. Créez le fichier .env dans mobile-agent.",
    );
  }

  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (options.authenticated !== false) {
    const token = options.token || (await getStoredToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT_MS);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!response.ok) {
      const message = String(data?.message || '');
      const expired = response.status === 401 || (
        response.status === 403 && /token invalide|token.*expir|compte.*désactivé|agent actif/i.test(message)
      );
      if (expired && sessionExpiredHandler) sessionExpiredHandler();
      throw new ApiError(
        message || `Erreur serveur (${response.status}).`,
        response.status,
        data,
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError('Le serveur ne répond pas. Vérifiez la connexion et réessayez.');
    }
    throw new ApiError(
      "Impossible de joindre le serveur JIRAMA. Vérifiez l'adresse API, le Wi-Fi et le démarrage du backend.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
