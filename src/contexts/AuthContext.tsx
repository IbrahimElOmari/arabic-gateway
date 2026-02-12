import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type AppRole = 'admin' | 'teacher' | 'student';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  study_level: string | null;
  avatar_url: string | null;
  preferred_language: string;
  preferred_theme: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (
    email: string, 
    password: string, 
    fullName: string,
    phone?: string | null,
    address?: string | null,
    dateOfBirth?: string | null,
    studyLevel?: string | null
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const initialLoadDone = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      if (data?.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      const fetchedRole = (data?.role as AppRole) || null;
      setRole(fetchedRole);
      return fetchedRole;
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole(null);
      return null;
    }
  };

  const fetchUserData = async (userId: string) => {
    await Promise.all([
      fetchProfile(userId),
      fetchRole(userId),
    ]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial load via getSession - single source of truth
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          await fetchUserData(existingSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    };

    initializeAuth();

    // 2. Subsequent changes via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        // Skip events during initial load - getSession handles that
        if (!initialLoadDone.current) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Only update session/user, do NOT refetch role (prevents race condition)
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          return;
        }

        if (event === 'SIGNED_IN') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string,
    phone?: string | null,
    address?: string | null,
    dateOfBirth?: string | null,
    studyLevel?: string | null
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            phone: phone || null,
            address: address || null,
            date_of_birth: dateOfBirth || null,
            study_level: studyLevel || null,
          },
        },
      });

      if (error) throw error;

      toast({
        title: t('auth.registerSuccess'),
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: (error as Error).message,
      });
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: t('auth.loginSuccess'),
      });

      return { error: null };
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('auth.invalidCredentials'),
        description: (error as Error).message,
      });
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
      toast({
        title: t('auth.logoutSuccess'),
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
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
