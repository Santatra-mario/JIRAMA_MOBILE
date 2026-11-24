import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'jirama_agent_token_v1';
const USER_KEY = 'jirama_agent_user_v1';

export type AgentUser = {
  id: number;
  nom?: string;
  prenom?: string;
  identifiant?: string;
  email?: string;
  role: string;
  statut?: string;
};

export type AgentSession = {
  token: string;
  user: AgentUser;
};

export async function saveAgentSession(session: AgentSession) {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function readAgentSession(): Promise<AgentSession | null> {
  const [token, rawUser] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);

  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as AgentUser;
    if (!user || String(user.role || '').trim().toUpperCase() !== 'AGENT') {
      return null;
    }
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearAgentSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
