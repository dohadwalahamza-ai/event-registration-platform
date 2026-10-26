import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_AUTH_KEY = 'eventform_admin_session_v1';

const DEFAULT_DEMO_ADMIN: UserProfile = {
  id: 'admin-1',
  email: 'admin@eventform.com',
  name: 'Hamza Dohadwala',
  role: 'admin',
  created_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || 'admin@eventform.com',
              name: data.session.user.user_metadata?.name || 'Administrator',
              role: 'admin',
              created_at: data.session.user.created_at,
            });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Supabase session check error', e);
        }
      }

      // Check stored local session
      try {
        const stored = localStorage.getItem(STORAGE_AUTH_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Pre-populate with default demo admin session for seamless first-run
          setUser(DEFAULT_DEMO_ADMIN);
          localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(DEFAULT_DEMO_ADMIN));
        }
      } catch (err) {
        console.error('Failed to read auth session', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            role: 'admin',
            created_at: data.user.created_at,
          };
          setUser(profile);
          localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase login error, attempting fallback', err);
      }
    }

    // Offline / Demo validation
    if (password.length < 4) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const demoProfile: UserProfile = {
      id: `admin-${Math.random().toString(36).substring(2, 8)}`,
      email: email.trim().toLowerCase(),
      name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    setUser(demoProfile);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(demoProfile));
    setIsLoading(false);
    return { success: true };
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
          },
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: name.trim() || 'Administrator',
            role: 'admin',
            created_at: data.user.created_at,
          };
          setUser(profile);
          localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase signup error', err);
      }
    }

    // Offline signup
    const newProfile: UserProfile = {
      id: `admin-${Math.random().toString(36).substring(2, 8)}`,
      email: email.trim().toLowerCase(),
      name: name.trim() || 'Event Administrator',
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    setUser(newProfile);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(newProfile));
    setIsLoading(false);
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout warning', e);
      }
    }

    setUser(null);
    localStorage.removeItem(STORAGE_AUTH_KEY);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
