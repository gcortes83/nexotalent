import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import type { AccountKind, AuthResponse, User } from '../api/types';

interface Session {
  user: User | null;
  loading: boolean;
  /** Login de demo sin contraseña (/login?demo=1). */
  login: (email: string) => Promise<User>;
  loginWithPassword: (email: string, password: string, kind: AccountKind) => Promise<User>;
  /** Abre sesión con un token ya emitido (p. ej. tras registrarse). */
  startSession: (auth: AuthResponse) => User;
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: !!tokenStore.get(), retry: false, staleTime: Infinity });

  const startSession = useCallback(
    ({ token, user }: AuthResponse) => {
      tokenStore.set(token);
      // Limpia datos de la sesión anterior sin desconectar el observador de ['me'].
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
      qc.setQueryData(['me'], user);
      return user;
    },
    [qc],
  );
  const login = useCallback(async (email: string) => startSession(await api.demoLogin(email)), [startSession]);
  const loginWithPassword = useCallback(
    async (email: string, password: string, kind: AccountKind) => startSession(await api.login(email, password, kind)),
    [startSession],
  );
  const logout = useCallback(() => {
    tokenStore.set(null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    qc.setQueryData(['me'], null);
  }, [qc]);

  const value = useMemo<Session>(
    () => ({ user: me.data ?? null, loading: me.isLoading, login, loginWithPassword, startSession, logout }),
    [me.data, me.isLoading, login, loginWithPassword, startSession, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession fuera de SessionProvider');
  return s;
}

export const homeFor = (u: User | null) =>
  !u ? '/' : u.role === 'candidate' ? '/c/dashboard' : u.role === 'platform_admin' ? '/jobs' : '/e/dashboard';

/** Ruta interna segura para volver tras login/registro (evita redirecciones abiertas: `//evil.com`, `https://…`). */
export const safeNext = (p: string | null | undefined): string | null =>
  p && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : null;
