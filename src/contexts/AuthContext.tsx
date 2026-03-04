import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type AppRole = 'admin' | 'teacher' | 'student';
type RoleStatus = 'idle' | 'loading' | 'ready' | 'error';

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
  roleStatus: RoleStatus;
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
  retryRoleResolution: () => void;
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
  const [roleStatus, setRoleStatus] = useState<RoleStatus>('idle');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const fetchIdRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
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
  }, [i18n]);

  const fetchRole = useCallback(async (userId: string): Promise<AppRole | null> => {
    // Use RPC get_user_role for atomic, server-side role resolution
    const attempt = async (): Promise<AppRole | null> => {
      const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
      if (error) throw error;
      return (data as AppRole) || null;
    };

    try {
      return await attempt();
    } catch (error) {
      console.error('Role fetch attempt 1 failed:', error);
      // Retry once after 500ms
      await new Promise((r) => setTimeout(r, 500));
      try {
        return await attempt();
      } catch (retryError) {
        console.error('Role fetch attempt 2 failed:', retryError);
        return null;
      }
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string, preserveExistingRole = false) => {
    const currentFetchId = ++fetchIdRef.current;

    if (!preserveExistingRole) {
      setRoleStatus('loading');
    }

    const [, fetchedRole] = await Promise.all([
      fetchProfile(userId),
      fetchRole(userId),
    ]);

    // Only apply if this is still the latest fetch
    if (currentFetchId !== fetchIdRef.current) return;

    if (fetchedRole !== null) {
      setRole(fetchedRole);
      setRoleStatus('ready');
    } else if (!preserveExistingRole) {
      // Only set error if we don't have an existing valid role
      setRoleStatus(role !== null ? 'ready' : 'error');
    }
    // If preserveExistingRole=true and fetchedRole=null, keep existing role & status
  }, [fetchProfile, fetchRole, role]);

  const retryRoleResolution = useCallback(() => {
    if (user) {
      setRoleStatus('loading');
      fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id, true);
    }
  }, [user, fetchUserData]);

  // Single initialization path: onAuthStateChange only
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log('[Auth] event:', event, 'user:', !!currentSession?.user);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setRoleStatus('idle');
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          // Preserve existing role, just refresh in background
          if (currentSession?.user) {
            fetchUserData(currentSession.user.id, true);
          }
          return;
        }

        // INITIAL_SESSION or SIGNED_IN
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setRoleStatus('idle');
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Safety timeout: force loading=false after 5s
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timed out after 5s – forcing loaded state');
        setLoading(false);
        // If we have a user but role didn't resolve, mark error
        if (role === null && roleStatus === 'loading') {
          setRoleStatus('error');
        }
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recovery: if user exists but role failed, retry once after 300ms
  useEffect(() => {
    if (loading || !user || roleStatus !== 'error') return;

    const timer = setTimeout(() => {
      console.log('[Auth] Role recovery attempt for', user.id);
      setRoleStatus('loading');
      fetchUserData(user.id);
    }, 300);

    return () => clearTimeout(timer);
  }, [loading, user, roleStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = useCallback(async (
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
  }, [toast, t]);

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, [toast, t]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setRole(null);
      setRoleStatus('idle');
      toast({
        title: t('auth.logoutSuccess'),
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [toast, t]);

  const value = {
    user,
    session,
    profile,
    role,
    roleStatus,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    retryRoleResolution,
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
