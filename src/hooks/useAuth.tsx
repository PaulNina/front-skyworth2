/**
 * Auth Context - Skyworth Mundial 2026
 * 
 * Migrated from Supabase to custom backend (skyworthyassir-back)
 * Uses JWT authentication with the Spring Boot backend
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authService, StoredUser } from '@/services/authService';

type UserRole = 'admin' | 'seller' | 'user';

interface AuthContextType {
  user: StoredUser | null;
  loading: boolean;
  rolesLoaded: boolean;
  rolesError: string | null;
  roles: UserRole[];
  isAdmin: boolean;
  isSeller: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

// Keep a stable Context reference across Vite HMR
const AUTH_CONTEXT_KEY = "__SKYWORTH_AUTH_CONTEXT__";
const AuthContext = ((globalThis as Record<string, unknown>)[AUTH_CONTEXT_KEY] ??
  createContext<AuthContextType | undefined>(undefined)) as ReturnType<typeof createContext<AuthContextType | undefined>>;
(globalThis as Record<string, unknown>)[AUTH_CONTEXT_KEY] = AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  // Load user from authService on mount
  const loadUserFromStorage = useCallback(() => {
    try {
      const storedUser = authService.getUser();
      if (storedUser) {
        setUser(storedUser);
        // Map backend roles to frontend roles
        const userRoles: UserRole[] = [];
        if (storedUser.rol === 'ADMIN') {
          userRoles.push('admin');
        }
        if (storedUser.rol === 'VENDEDOR') {
          userRoles.push('seller');
        }
        if (userRoles.length === 0) {
          userRoles.push('user');
        }
        setRoles(userRoles);
        setRolesLoaded(true);
        setRolesError(null);
      } else {
        setUser(null);
        setRoles([]);
        setRolesLoaded(true);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      setRolesError('Error al cargar usuario');
      setRolesLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // refreshRoles: reload user from storage
  const refreshRoles = useCallback(async () => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setRolesLoaded(false);
    setRolesError(null);

    const result = await authService.login(email, password);

    if (result.error) {
      setLoading(false);
      setRolesLoaded(true);
      return { error: result.error };
    }

    // Load user data from the login response
    const storedUser = authService.getUser();
    if (storedUser) {
      setUser(storedUser);
      const userRoles: UserRole[] = [];
      if (storedUser.rol === 'ADMIN') {
        userRoles.push('admin');
      }
      if (storedUser.rol === 'VENDEDOR') {
        userRoles.push('seller');
      }
      if (userRoles.length === 0) {
        userRoles.push('user');
      }
      setRoles(userRoles);
    }

    setRolesLoaded(true);
    setLoading(false);
    return { error: null };
  }, []);

  // SignUp - For vendor self-registration
  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    // For vendor registration, we'll need to call a different endpoint
    // This is a placeholder - the actual implementation depends on backend endpoint
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7000'}/api/vendedor/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          ...metadata,
        }),
      });

      const result = await response.json();

      if (result.error || !response.ok) {
        return { error: new Error(result.mensaje || 'Error al registrar') };
      }

      // Vendor registration might require admin approval
      return { 
        error: null, 
        needsEmailConfirmation: false 
      };
    } catch (error) {
      console.error('SignUp error:', error);
      return { 
        error: error instanceof Error ? error : new Error('Error de conexión') 
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    authService.logout();
    setUser(null);
    setRoles([]);
    setRolesLoaded(true);
    setRolesError(null);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    rolesLoaded,
    rolesError,
    roles,
    isAdmin: roles.includes('admin'),
    isSeller: roles.includes('seller'),
    signIn,
    signUp,
    signOut,
    refreshRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  // HMR recovery for dev
  if (context === undefined) {
    if (import.meta.env.DEV) {
      try {
        const key = "__AUTHCTX_RELOAD_ONCE__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          setTimeout(() => window.location.reload(), 0);

          // Return temporal while reloading
          return {
            user: null,
            loading: true,
            rolesLoaded: false,
            rolesError: null,
            roles: [],
            isAdmin: false,
            isSeller: false,
            signIn: async () => ({ error: new Error("Auth inicializando...") }),
            signUp: async () => ({ error: new Error("Auth inicializando...") }),
            signOut: async () => {},
            refreshRoles: async () => {},
          } as AuthContextType;
        }
      } catch {
        // ignore
      }
    }

    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
