import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/db/supabase';
import { db, DEFAULT_GYM_ID } from '@/db/dexie';

interface AuthContextType {
  userRole: UserRole;
  profile: Profile | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  loginAs: (role: UserRole, displayName?: string) => void;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'aim_auth_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default initial session for immediate offline usage
    return {
      id: '20000000-0000-0000-0000-000000000001',
      gym_id: DEFAULT_GYM_ID,
      role: 'owner',
      display_name: 'Owner (AIM Fitness)',
      email: 'owner@aimfitness.local',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Supabase auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        db.profiles
          .where('user_id')
          .equals(session.user.id)
          .first()
          .then((p) => {
            if (p) {
              setProfile(p);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(p));
            }
          });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const p = await db.profiles.where('user_id').equals(session.user.id).first();
        if (p) {
          setProfile(p);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(p));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginAs = (role: UserRole, displayName?: string) => {
    const newProfile: Profile = {
      id: role === 'owner' ? '20000000-0000-0000-0000-000000000001' : '20000000-0000-0000-0000-000000000002',
      gym_id: DEFAULT_GYM_ID,
      role,
      display_name: displayName || (role === 'owner' ? 'Owner (AIM Fitness)' : 'Front Desk Staff'),
      email: `${role}@aimfitness.local`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfile(newProfile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
  };

  const switchRole = (role: UserRole) => {
    loginAs(role);
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        userRole: profile?.role || 'staff',
        profile,
        isAuthenticated: Boolean(profile),
        isOnline,
        loginAs,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
