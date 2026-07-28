import { create } from 'zustand';
import type { User, Role } from '@/types/api';

interface AuthState {
  user: User | null;
  roles: Role[];
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, roles: Role[]) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  roles: [],
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token, roles) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken: token, roles, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, roles: [], isAuthenticated: false });
  },
  setUser: (user) => set({ user }),
}));
