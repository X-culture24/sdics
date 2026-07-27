import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/services/api/auth';
import { TokenManager } from '@/services/api/client';
import type { LoginRequest, LoginResponse, User } from '@/types/dto';
import { ROLE_NAMES } from '@/constants';

export type ThemeMode = 'light' | 'dark';

interface AuthContextShape {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (req: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roleName: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccessNav: (roles: string[]) => boolean;
  setThemeMode: (m: ThemeMode) => void;
  themeMode: ThemeMode;
}

const AuthContext = createContext<AuthContextShape | null>(null);

const THEME_KEY = 'nvrcms:theme';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(TokenManager.getUser());
  const [loading, setLoading] = useState<boolean>(!TokenManager.getAccessToken());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    try {
      localStorage.setItem(THEME_KEY, m);
    } catch {}
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      TokenManager.setUser(me);
    } catch {
      TokenManager.clearAll();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (TokenManager.getAccessToken() && !user) {
      setLoading(true);
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      TokenManager.clearAll();
      setUser(null);
    };
    window.addEventListener('nvrcms:logout' as any, handleLogout);
    return () => window.removeEventListener('nvrcms:logout' as any, handleLogout);
  }, []);

  const login = useCallback(
    async (req: LoginRequest) => {
      const resp = await authApi.login(req);
      authApi.saveSession(resp);
      setUser(resp.user);
      return resp;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    TokenManager.clearAll();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (roleName: string | string[]) => {
      if (!user) return false;
      const name = user.role?.name;
      if (name === ROLE_NAMES.SYSADMIN) return true;
      if (Array.isArray(roleName)) return roleName.includes(name ?? '');
      return name === roleName;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: string[]) => roles.includes('*') ? !!user : hasRole(roles),
    [hasRole, user],
  );

  const canAccessNav = useCallback(
    (roles: string[]) => {
      if (roles.includes('*')) return !!user;
      return hasAnyRole(roles);
    },
    [hasAnyRole, user],
  );

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      isAuthenticated: !!user && !!TokenManager.getAccessToken(),
      loading,
      login,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
      canAccessNav,
      setThemeMode,
      themeMode,
    }),
    [user, loading, login, logout, refreshUser, hasRole, hasAnyRole, canAccessNav, setThemeMode, themeMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
