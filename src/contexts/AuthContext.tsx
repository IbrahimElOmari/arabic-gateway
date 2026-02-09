import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [roleLoading, setRoleLoading] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      // Update language preference
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
      setRole(data?.role as AppRole || null);
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole(null);
    }
  };

  const fetchUserData = async (userId: string) => {
    setRoleLoading(true);
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchRole(userId),
      ]);
    } finally {
      setRoleLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to prevent potential deadlock with Supabase client
          setTimeout(async () => {
            if (!mounted) return;
            await fetchUserData(currentSession.user.id);
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        await fetchUserData(existingSession.user.id);
      }

      if (mounted) setLoading(false);
    });

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
