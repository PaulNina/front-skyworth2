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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    await supabase.auth.signOut();
    setRoles([]);
    setRolesLoaded(true);
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}