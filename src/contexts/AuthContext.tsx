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
  const isFetching = useRef(false);
  const roleRecoveryAttemptedFor = useRef<string | null>(null);

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

  const resolveEffectiveRole = (
    roleRows: Array<{ role: string }> | null
  ): AppRole | null => {
    if (!roleRows || roleRows.length === 0) return null;

    const roles = roleRows.map((row) => row.role);

    if (roles.includes('admin')) return 'admin';
    if (roles.includes('teacher')) return 'teacher';
    if (roles.includes('student')) return 'student';

    return null;
  };

  const fetchRole = async (userId: string) => {
    const readRole = async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      return resolveEffectiveRole(data as Array<{ role: string }> | null);
    };

    try {
      const fetchedRole = await readRole();
      setRole(fetchedRole);
      return fetchedRole;
    } catch (error) {
      console.error('Error fetching role (attempt 1):', error);
      await new Promise((r) => setTimeout(r, 500));
      try {
        const retryRole = await readRole();
        setRole(retryRole);
        return retryRole;
      } catch (retryError) {
        console.error('Error fetching role (attempt 2):', retryError);
        setRole(null);
        return null;
      }
    }
  };

  const fetchUserData = async (userId: string) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchRole(userId),
      ]);
    } finally {
      isFetching.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout: force loading=false after 5s to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
      if (mounted && !initialLoadDone.current) {
        console.warn('Auth initialization timed out after 5s – forcing loaded state');
        setLoading(false);
        initialLoadDone.current = true;
      }
    }, 5000);

    const initializeAuth = async () => {
      try {
        await new Promise(r => setTimeout(r, 100));
        if (!mounted || initialLoadDone.current) return;

        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!mounted || initialLoadDone.current) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          setProfile(null);
          setRole(null);
          await fetchUserData(existingSession.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted && !initialLoadDone.current) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (event === 'INITIAL_SESSION') {
          setLoading(true);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setProfile(null);
          setRole(null);

          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          }

          setLoading(false);
          initialLoadDone.current = true;
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          } else {
            setProfile(null);
            setRole(null);
          }

          return;
        }

        if (event === 'SIGNED_IN') {
          setLoading(true);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setProfile(null);
          setRole(null);

          if (currentSession?.user) {
            await fetchUserData(currentSession.user.id);
          }

          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || !user || role !== null) {
      roleRecoveryAttemptedFor.current = null;
      return;
    }

    if (roleRecoveryAttemptedFor.current === user.id) return;
    roleRecoveryAttemptedFor.current = user.id;
    void fetchUserData(user.id);
  }, [loading, user, role]);

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
        title: t('auth2.registrationComplete'),
        description: t('auth2.checkEmail'),
      });

      return { error: null, success: true };
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
