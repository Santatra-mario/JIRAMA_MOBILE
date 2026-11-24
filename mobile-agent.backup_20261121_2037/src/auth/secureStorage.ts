import * as SecureStore from 'expo-secure-store';
import type { AgentUser } from '../types/agent';

const TOKEN_KEY = 'jirama_agent_token_v1';
const USER_KEY = 'jirama_agent_user_v1';

export type StoredSession = {
  token: string;
  user: AgentUser;
};

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AgentUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AgentUser;
    if (parsed?.role !== 'AGENT' || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<StoredSession | null> {
  const [token, user] = await Promise.all([getStoredToken(), getStoredUser()]);
  if (!token || !user) return null;
  return { token, user };
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
