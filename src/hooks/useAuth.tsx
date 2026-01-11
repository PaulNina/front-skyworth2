// Auth context with proper role loading - Updated 2026-01-11
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'seller' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoaded: boolean;
  roles: UserRole[];
  isAdmin: boolean;
  isSeller: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null }>;
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
  const [roles, setRoles] = useState<UserRole[]>([]);

  const fetchRoles = async (userId: string): Promise<UserRole[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data?.map(r => r.role as UserRole)) || [];
    } catch (err) {
      console.error('Error in fetchRoles:', err);
      return [];
    }
  };

  const refreshRoles = async () => {
    if (user) {
      const userRoles = await fetchRoles(user.id);
      setRoles(userRoles);
      setRolesLoaded(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    // If we previously forced a one-time reload to heal HMR context mismatch,
    // clear the flag once the provider mounts successfully.
    try {
      sessionStorage.removeItem("__AUTHCTX_RELOAD_ONCE__");
    } catch {
      // ignore
    }

    // Initialize auth - check for existing session FIRST
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Fetch roles and WAIT for them before setting loading to false
          const userRoles = await fetchRoles(currentSession.user.id);
          if (mounted) {
            setRoles(userRoles);
            setRolesLoaded(true);
          }
        } else {
          // No user, roles are "loaded" (empty)
          setRolesLoaded(true);
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setRolesLoaded(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // Update session/user immediately
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Mark roles as loading when user changes
          setRolesLoaded(false);
          
          // Fetch roles for the new user
          const userRoles = await fetchRoles(newSession.user.id);
          if (mounted) {
            setRoles(userRoles);
            setRolesLoaded(true);
          }
        } else {
          // User signed out
          setRoles([]);
          setRolesLoaded(true);
        }

        // Only set loading to false after initial load
        if (loading && mounted) {
          setLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Reset roles loaded state before sign in
    setRolesLoaded(false);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Clear state first to prevent UI freeze
      setRoles([]);
      setUser(null);
      setSession(null);
      setRolesLoaded(true);
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      // Navigate to home after successful logout
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even on error
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    loading,
    rolesLoaded,
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

  // In dev (Vite HMR), React Context can temporarily mismatch between Provider/Consumer
  // after a hot update. Instead of hard-crashing into a blank screen, force a one-time
  // full reload to restore a consistent module graph.
  if (context === undefined) {
    if (import.meta.env.DEV) {
      try {
        const key = "__AUTHCTX_RELOAD_ONCE__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          setTimeout(() => window.location.reload(), 0);
        }
      } catch {
        // ignore
      }

      // Minimal safe fallback while the reload happens.
      return {
        user: null,
        session: null,
        loading: true,
        rolesLoaded: false,
        roles: [],
        isAdmin: false,
        isSeller: false,
        signIn: async () => ({ error: new Error("Auth inicializando, recargando...") }),
        signUp: async () => ({ error: new Error("Auth inicializando, recargando...") }),
        signOut: async () => {},
        refreshRoles: async () => {},
      } as AuthContextType;
    }

    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}