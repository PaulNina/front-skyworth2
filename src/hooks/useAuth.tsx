/**
 * Auth Context - Skyworth Mundial 2026
 * 
 * CRITICAL: Este hook maneja autenticación Y roles de forma robusta.
 * - rolesLoaded: true solo cuando la consulta de roles terminó exitosamente
 * - rolesError: string cuando hubo error al cargar roles (diferente de "sin permisos")
 * - refreshRoles: permite reintentar carga de roles
 */
import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'seller' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  rolesError: string | null; // NUEVO: error al cargar roles
  roles: UserRole[];
  isAdmin: boolean;
  isSeller: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

// Keep a stable Context reference across Vite HMR to avoid "useAuth must be used within an AuthProvider"
// when this module is hot-reloaded but some consumers/providers still hold the previous instance.
const AUTH_CONTEXT_KEY = "__SKYWORTH_AUTH_CONTEXT__";
const AuthContext = ((globalThis as any)[AUTH_CONTEXT_KEY] ??
  createContext<AuthContextType | undefined>(undefined)) as ReturnType<typeof createContext<AuthContextType | undefined>>;
(globalThis as any)[AUTH_CONTEXT_KEY] = AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  const ROLES_TIMEOUT_MS = 8000;

  // CRITICAL: fetchRoles retorna { roles, error } para distinguir error de vacío
  // Incluye timeout para evitar spinners infinitos si hay problemas de red/RLS.
  const fetchRoles = useCallback(async (userId: string): Promise<{ roles: UserRole[]; error: string | null }> => {
    try {
      const { data, error } = await Promise.race([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), ROLES_TIMEOUT_MS)
        ),
      ]);

      if (error) {
        console.error('Error fetching roles:', error);
        return { roles: [], error: `Error al cargar permisos: ${error.message}` };
      }

      return {
        roles: (data?.map((r) => r.role as UserRole)) || [],
        error: null,
      };
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'timeout'
          ? 'Tiempo de espera agotado cargando permisos. Reintenta.'
          : 'Error de conexión al cargar permisos';

      console.error('Error in fetchRoles:', err);
      return { roles: [], error: message };
    }
  }, []);

  const rolesRequestIdRef = useRef(0);

  const loadRolesForUser = useCallback(
    async (userId: string) => {
      const reqId = ++rolesRequestIdRef.current;

      setRolesLoaded(false);
      setRolesError(null);

      const result = await fetchRoles(userId);

      // Evitar aplicar respuestas viejas si hubo múltiples requests
      if (rolesRequestIdRef.current !== reqId) return;

      setRoles(result.roles);
      setRolesError(result.error);
      setRolesLoaded(true);
    },
    [fetchRoles]
  );

  // refreshRoles: puede ser llamado desde UI para reintentar
  const refreshRoles = useCallback(async () => {
    if (!user) return;
    await loadRolesForUser(user.id);
  }, [user, loadRolesForUser]);

  useEffect(() => {
    let mounted = true;

    // Clear HMR reload flag
    try {
      sessionStorage.removeItem("__AUTHCTX_RELOAD_ONCE__");
    } catch {
      // ignore
    }

    // CRITICAL: listener antes de getSession (evita race conditions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setRoles([]);
          setRolesLoaded(true);
          setRolesError('Error al inicializar autenticación');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // CRITICAL: roles se cargan SIEMPRE cuando cambia el userId (evita “se queda colgado”)
  useEffect(() => {
    if (!user) {
      setRoles([]);
      setRolesError(null);
      setRolesLoaded(true);
      return;
    }

    // Nota: loadRolesForUser maneja rolesLoaded/rolesError internamente
    void loadRolesForUser(user.id);
  }, [user?.id, loadRolesForUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setRolesLoaded(false);
    setRolesError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // CRITICAL: sembrar estado local inmediatamente (evita depender 100% del listener)
    if (!error) {
      setSession(data.session ?? null);
      setUser(data.user ?? data.session?.user ?? null);
    } else {
      // Evitar UI colgada si falla el login
      setRolesLoaded(true);
    }

    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    
    // CRITICAL: detectar si requiere confirmación de email
    const needsEmailConfirmation = !error && data?.user && !data?.session;
    
    return { 
      error: error as Error | null,
      needsEmailConfirmation 
    };
  }, []);

  // FIXED: signOut sin hard refresh, usa React Router
  const signOut = useCallback(async () => {
    try {
      // Clear state first
      setRoles([]);
      setUser(null);
      setSession(null);
      setRolesLoaded(true);
      setRolesError(null);
      
      await supabase.auth.signOut();
      // Navigation se manejará desde el componente que llama
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
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

  // HMR recovery for dev: intentar un reload UNA sola vez; si persiste, fallar explícitamente.
  if (context === undefined) {
    if (import.meta.env.DEV) {
      try {
        const key = "__AUTHCTX_RELOAD_ONCE__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          setTimeout(() => window.location.reload(), 0);

          // Return temporal mientras recarga
          return {
            user: null,
            session: null,
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
