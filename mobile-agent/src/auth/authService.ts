import { apiRequest } from '../api/apiClient';
import { saveSession, clearSession } from './secureStorage';
import type { AgentUser, AgentMission } from '../types/agent';

type LoginResponse = {
  status: string;
  message: string;
  token?: string;
  user?: AgentUser;
};

type MissionsResponse = {
  status: string;
  data?: AgentMission[];
};

export async function loginAgent(identifiant: string, motDePasse: string): Promise<AgentUser> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: {
      identifiant: identifiant.trim(),
      mot_de_passe: motDePasse,
    },
  });

  if (response?.status !== 'success' || !response.token || !response.user) {
    throw new Error(response?.message || 'La réponse du serveur est incomplète.');
  }

  const user = response.user;
  const role = String(user.role || '').trim().toUpperCase();
  const statut = String(user.statut || '').trim().toLowerCase();

  if (role !== 'AGENT') {
    throw new Error('Accès refusé : cette application est réservée aux Agents de terrain.');
  }
  if (statut !== 'actif') {
    throw new Error('Votre compte Agent est désactivé. Contactez le Responsable ou l’Administrateur.');
  }

  // Vérifier le JWT auprès d'une route Agent existante avant de persister la session.
  const verification = await apiRequest<MissionsResponse>('/agent/missions', {
    token: response.token,
  });
  if (verification?.status !== 'success' || !Array.isArray(verification.data)) {
    throw new Error('Le serveur n’a pas pu valider votre accès à l’espace Agent.');
  }

  const safeUser: AgentUser = { ...user, role: 'AGENT' };
  await saveSession({ token: response.token, user: safeUser });
  return safeUser;
}

export async function verifyStoredAgentSession(token: string): Promise<AgentMission[]> {
  const response = await apiRequest<MissionsResponse>('/agent/missions', { token });
  if (response?.status !== 'success' || !Array.isArray(response.data)) {
    throw new Error('Session Agent non vérifiée par le serveur.');
  }
  return response.data;
}

export async function logoutAgent(): Promise<void> {
  await clearSession();
}
