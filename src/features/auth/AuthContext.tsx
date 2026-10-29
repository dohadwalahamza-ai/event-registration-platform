import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_AUTH_KEY = 'eventform_admin_session_v1';
// 2.5 hours session duration (between 2-3 hours)
const SESSION_DURATION_MS = 2.5 * 60 * 60 * 1000;

interface StoredSession {
  user: UserProfile;
  expiresAt: number;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check stored local session first
      try {
        const stored = localStorage.getItem(STORAGE_AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const sessionUser: UserProfile = parsed.user || parsed;
          const expiresAt: number = parsed.expiresAt || 0;

          // If expired, clear and force login
          if (expiresAt && Date.now() > expiresAt) {
            localStorage.removeItem(STORAGE_AUTH_KEY);
            setUser(null);
          } else {
            setUser(sessionUser);
          }
        } else {
          // Do NOT auto-login. Require explicit user authentication.
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to read auth session', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }

      // 2. Optional Supabase session check if already active
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const supaProfile: UserProfile = {
              id: data.session.user.id,
              email: data.session.user.email || 'admin@admin.com',
              name: data.session.user.user_metadata?.name || 'Hamza Dohadwala',
              role: 'admin',
              created_at: data.session.user.created_at,
            };
            setUser(supaProfile);
            const sessionData: StoredSession = {
              user: supaProfile,
              expiresAt: Date.now() + SESSION_DURATION_MS,
            };
            localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(sessionData));
          }
        } catch (e) {
          console.warn('Supabase session check error', e);
        }
      }
    };

    initAuth();
  }, []);

  // Periodic session expiration watcher (auto-logout after 2.5 hours)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(STORAGE_AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            console.info('Admin session expired (2.5h limit reached). Logging out automatically.');
            logout();
          }
        }
      } catch {
        // ignore
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Verify authorized administrator credentials (supports custom changed password, 'secret', or 'admin@123')
    const normalizedEmail = cleanEmail === 'admin' ? 'admin@admin.com' : cleanEmail;
    const savedPassword = typeof window !== 'undefined' ? localStorage.getItem('eventform_admin_password') : null;
    const isAuthorizedAdmin =
      normalizedEmail === 'admin@admin.com' &&
      (Boolean(savedPassword && cleanPassword === savedPassword) ||
        cleanPassword === 'secret' ||
        cleanPassword === 'admin@123' ||
        cleanPassword === 'admin');

    if (!isAuthorizedAdmin) {
      // If Supabase is connected, optionally check if this is an authorized Supabase admin
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (!error && data.user) {
            const profile: UserProfile = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              name: data.user.user_metadata?.name || 'Administrator',
              role: 'admin',
              created_at: data.user.created_at,
            };
            const sessionData: StoredSession = {
              user: profile,
              expiresAt: Date.now() + SESSION_DURATION_MS,
            };
            setUser(profile);
            localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(sessionData));
            setIsLoading(false);
            return { success: true };
          }
        } catch {
          // ignore
        }
      }

      setIsLoading(false);
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    // Valid admin credentials
    const adminProfile: UserProfile = {
      id: 'admin-primary',
      email: cleanEmail,
      name: 'Administrator',
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    const sessionData: StoredSession = {
      user: adminProfile,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };

    // Attempt Supabase sign-in asynchronously if configured (non-blocking)
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword }).catch(() => {});
    }

    setUser(adminProfile);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(sessionData));
    setIsLoading(false);
    return { success: true };
  };

  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanEmail !== 'admin@admin.com') {
      setIsLoading(false);
      return {
        success: false,
        error: 'Administrator registration is restricted.',
      };
    }

    const profile: UserProfile = {
      id: 'admin-primary',
      email: 'admin@admin.com',
      name: name.trim() || 'Hamza Dohadwala',
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    const sessionData: StoredSession = {
      user: profile,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };

    setUser(profile);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(sessionData));
    setIsLoading(false);
    return { success: true };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanNew || cleanNew.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    const savedPassword = typeof window !== 'undefined' ? localStorage.getItem('eventform_admin_password') : null;
    const isValidCurrent = savedPassword
      ? cleanCurrent === savedPassword
      : (cleanCurrent === 'secret' || cleanCurrent === 'admin@123' || cleanCurrent === 'admin');

    if (!isValidCurrent) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    // Persist new password locally
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventform_admin_password', cleanNew);
    }

    // If Supabase Auth is active, also synchronize remote user password
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.updateUser({ password: cleanNew });
      } catch (err) {
        console.warn('Supabase password update note:', err);
      }
    }

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
        changePassword,
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
