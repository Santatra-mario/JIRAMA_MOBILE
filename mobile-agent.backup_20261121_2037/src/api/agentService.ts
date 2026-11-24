import { apiRequest } from './apiClient';
import type {
  AgentAbonne,
  AgentAnomalie,
  AgentCompteur,
  AgentDashboardData,
  AgentMission,
  AgentNotification,
  AgentReleve,
} from '../types/agent';

type ListResponse<T> = { status: string; data?: T[]; total?: number; unreadCount?: number; message?: string };
type ItemResponse<T> = { status: string; data?: T; message?: string };

export async function fetchAgentDashboard(): Promise<AgentDashboardData> {
  const response = await apiRequest<AgentDashboardData>('/agent/dashboard');
  if (response.status !== 'success') throw new Error('Impossible de charger le tableau de bord Agent.');
  return {
    ...response,
    stats: response.stats || {},
    relevesRecents: Array.isArray(response.relevesRecents) ? response.relevesRecents : [],
    anomaliesRecentes: Array.isArray(response.anomaliesRecentes) ? response.anomaliesRecentes : [],
  };
}

export async function fetchAgentCompteurs(): Promise<AgentCompteur[]> {
  const response = await apiRequest<ListResponse<AgentCompteur>>('/agent/compteurs');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les compteurs.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentAbonnes(): Promise<AgentAbonne[]> {
  const response = await apiRequest<ListResponse<AgentAbonne>>('/agent/abonnes');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les abonnés.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentReleves(): Promise<AgentReleve[]> {
  const response = await apiRequest<ListResponse<AgentReleve>>('/agent/releves');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les relevés.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentRelevesByCompteur(compteurId: number): Promise<AgentReleve[]> {
  const response = await apiRequest<ListResponse<AgentReleve>>(`/agent/releves/compteur/${compteurId}`);
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger l’historique du compteur.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentAnomalies(filters: { recherche?: string; type?: string; niveau?: string; statut?: string } = {}): Promise<AgentAnomalie[]> {
  const params = Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const response = await apiRequest<ListResponse<AgentAnomalie>>(`/agent/anomalies${params ? `?${params}` : ''}`);
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les anomalies.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentNotifications(): Promise<{ items: AgentNotification[]; unreadCount: number }> {
  const response = await apiRequest<ListResponse<AgentNotification>>('/agent/notifications');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les notifications.');
  const items = Array.isArray(response.data) ? response.data : [];
  return { items, unreadCount: Number(response.unreadCount ?? items.filter((item) => item.statut === 'EN_ATTENTE').length) };
}

export async function markAgentNotificationAsRead(id: number): Promise<void> {
  await apiRequest(`/agent/notifications/${id}/lue`, { method: 'PATCH' });
}

export async function markAllAgentNotificationsAsRead(): Promise<void> {
  await apiRequest('/agent/notifications/lire-tout', { method: 'PATCH' });
}


export async function fetchAgentNotificationCount(): Promise<number> {
  const response = await apiRequest<{ status: string; total?: number; message?: string }>('/agent/notifications/count');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger le compteur de notifications.');
  return Number(response.total || 0);
}

export async function archiveAgentNotification(id: number): Promise<void> {
  const response = await apiRequest<{ status: string; message?: string }>(`/notifications/${id}/archiver`, { method: 'PATCH' });
  if (response.status !== 'success') throw new Error(response.message || 'Impossible d’archiver la notification.');
}

export async function deleteAgentNotification(id: number): Promise<void> {
  const response = await apiRequest<{ status: string; message?: string }>(`/notifications/${id}`, { method: 'DELETE' });
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de supprimer la notification.');
}

export async function updateAgentReleve(id: number, payload: {
  date_releve: string;
  date_ancien_releve?: string;
  nouvel_index: number;
  observation?: string | null;
}): Promise<any> {
  const response = await apiRequest<{ status: string; message?: string; data?: unknown }>(`/agent/releves/${id}`, { method: 'PUT', body: payload });
  if (response.status !== 'success') throw new Error(response.message || 'Le serveur n’a pas confirmé la correction du relevé.');
  return response;
}

export async function fetchAgentMissions(): Promise<AgentMission[]> {
  const response = await apiRequest<ListResponse<AgentMission>>('/agent/missions');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les missions.');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAgentMission(id: number): Promise<AgentMission> {
  const response = await apiRequest<ItemResponse<AgentMission>>(`/agent/missions/${id}`);
  if (!response.data) throw new Error(response.message || 'Détail de mission indisponible.');
  return response.data;
}

export async function startAgentMission(id: number): Promise<void> {
  await apiRequest(`/agent/missions/${id}/statut`, { method: 'PATCH', body: { statut: 'EN_COURS' } });
}

export async function reportUnsuccessfulVisit(id: number, resultatVisite: string, motif: string): Promise<void> {
  await apiRequest(`/agent/missions/${id}/statut`, {
    method: 'PATCH',
    body: { statut: 'A_REPROGRAMMER', motif, resultat_visite: resultatVisite, date_visite_reelle: localDateString() },
  });
}

export async function createAgentReleve(payload: {
  mission_id?: number;
  compteur_id: number;
  nouvel_index: number;
  date_visite_reelle?: string;
  observation?: string | null;
}): Promise<any> {
  return apiRequest('/agent/releves', { method: 'POST', body: payload });
}

export async function createAgentCompteur(payload: {
  numero_compteur: string;
  type: 'EAU' | 'ELECTRICITE';
  date_installation?: string | null;
  statut: 'ACTIF' | 'INACTIF' | 'A_VERIFIER';
  abonne_id: number;
}): Promise<any> {
  return apiRequest('/compteurs', { method: 'POST', body: payload });
}

export async function fetchAgentSettings(): Promise<any> {
  return apiRequest('/settings');
}

export async function saveAgentPreferences(settings: any): Promise<any> {
  return apiRequest('/settings/preferences', { method: 'PATCH', body: { settings } });
}

export async function saveAgentProfile(profile: { nom: string; prenom: string; email: string }): Promise<any> {
  return apiRequest('/settings/profile', { method: 'PATCH', body: profile });
}

export async function changeAgentPassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<any> {
  return apiRequest('/settings/password', { method: 'PATCH', body: payload });
}

export async function fetchAgentAuditLogs(): Promise<any[]> {
  const response = await apiRequest<{ status: string; logs?: any[]; message?: string }>('/settings/audit?limit=100');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger le journal d’activité.');
  return Array.isArray(response.logs) ? response.logs : [];
}

export async function fetchAgentArchivedNotifications(): Promise<AgentNotification[]> {
  // Le contrôleur notificationController retourne `notifications` (et non `data`).
  const response = await apiRequest<{ status: string; notifications?: AgentNotification[]; message?: string }>('/notifications?vue=archivees');
  if (response.status !== 'success') throw new Error(response.message || 'Impossible de charger les notifications archivées.');
  return Array.isArray(response.notifications) ? response.notifications : [];
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
