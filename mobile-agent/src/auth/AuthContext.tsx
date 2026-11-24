import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, setSessionExpiredHandler } from '../api/apiClient';
import type { AgentUser } from '../types/agent';
import { loginAgent, logoutAgent, verifyStoredAgentSession } from './authService';
import { readSession } from './secureStorage';

type AuthContextValue = {
  user: AgentUser | null;
  loading: boolean;
  offlineWarning: string | null;
  signIn: (identifiant: string, motDePasse: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AgentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineWarning, setOfflineWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await readSession();
        if (!session) return;
        try {
          await verifyStoredAgentSession(session.token);
          if (active) setUser(session.user);
        } catch (error) {
          const status = error instanceof ApiError ? error.status : null;
          if (status === 401 || status === 403) {
            const { clearSession } = await import('./secureStorage');
            await clearSession();
          } else if (active) {
            // Conserver le jeton, mais ne pas ouvrir l'espace protégé sans vérification serveur.
            // Le mode hors connexion métier sera activé après mise en place du cache local.
            setOfflineWarning('Serveur non joignable : connectez le téléphone au réseau pour vérifier votre session Agent.');
          }
        }
      } catch {
        if (active) setOfflineWarning('Impossible de restaurer la session sécurisée.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (identifiant: string, motDePasse: string) => {
    const authenticatedUser = await loginAgent(identifiant, motDePasse);
    setUser(authenticatedUser);
    setOfflineWarning(null);
  }, []);

  const signOut = useCallback(async () => {
    await logoutAgent();
    setUser(null);
    setOfflineWarning(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => { void signOut(); });
    return () => setSessionExpiredHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ user, loading, offlineWarning, signIn, signOut }), [user, loading, offlineWarning, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
