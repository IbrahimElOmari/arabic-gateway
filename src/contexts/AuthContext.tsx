import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type AppRole = 'admin' | 'teacher' | 'student';
type RoleStatus = 'loading' | 'ready' | 'error';

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
  const [roleStatus, setRoleStatus] = useState<RoleStatus>('loading');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Monotonic request ID to implement latest-wins for concurrent fetches
  const fetchIdRef = useRef(0);
  // Refs to avoid stale closures in callbacks
  const roleRef = useRef<AppRole | null>(null);
  const roleStatusRef = useRef<RoleStatus>('loading');

  const updateRole = useCallback((newRole: AppRole | null, newStatus: RoleStatus) => {
    roleRef.current = newRole;
    roleStatusRef.current = newStatus;
    setRole(newRole);
    setRoleStatus(newStatus);
  }, []);

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

  const fetchRoleWithTimeout = useCallback(async (userId: string): Promise<AppRole | null> => {
    const attempt = async (): Promise<AppRole | null> => {
      const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
      if (error) throw error;
      return (data as AppRole) || null;
    };

    try {
      // Race against a 3s timeout
      const result = await Promise.race([
        attempt(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Role fetch timeout')), 3000)
        ),
      ]);
      return result;
    } catch (error) {
      console.error('Role fetch attempt 1 failed:', error);
      // Single retry after 500ms
      await new Promise((r) => setTimeout(r, 500));
      try {
        return await Promise.race([
          attempt(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Role retry timeout')), 3000)
          ),
        ]);
      } catch (retryError) {
        console.error('Role fetch attempt 2 failed:', retryError);
        return null;
      }
    }
  }, []);

  /**
   * Fetch profile + role for a user. Uses fetchIdRef for latest-wins semantics.
   * @param preserveExistingRole - if true and fetch fails, keep current role instead of going to error
   */
  const resolveUserData = useCallback(async (userId: string, preserveExistingRole = false) => {
    const currentFetchId = ++fetchIdRef.current;

    if (!preserveExistingRole) {
      updateRole(roleRef.current, 'loading');
    }

    const [, fetchedRole] = await Promise.all([
      fetchProfile(userId),
      fetchRoleWithTimeout(userId),
    ]);

    // Only apply if this is still the latest fetch
    if (currentFetchId !== fetchIdRef.current) return;

    if (fetchedRole !== null) {
      updateRole(fetchedRole, 'ready');
    } else if (preserveExistingRole && roleRef.current !== null) {
      // Keep existing role, don't change status
      console.log('[Auth] Role refresh failed, keeping existing role:', roleRef.current);
    } else {
      // No role found and nothing to preserve — error
      updateRole(null, 'error');
    }
  }, [fetchProfile, fetchRoleWithTimeout, updateRole]);

  const retryRoleResolution = useCallback(() => {
    if (user) {
      updateRole(null, 'loading');
      resolveUserData(user.id);
    }
  }, [user, resolveUserData, updateRole]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await resolveUserData(user.id, true);
    }
  }, [user, resolveUserData]);

  // Single initialization: onAuthStateChange only
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
          updateRole(null, 'loading');
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          // Background refresh — preserve existing role
          if (currentSession?.user) {
            resolveUserData(currentSession.user.id, true);
          }
          return;
        }

        // INITIAL_SESSION or SIGNED_IN
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await resolveUserData(currentSession.user.id);
        } else {
          setProfile(null);
          updateRole(null, 'loading');
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    // Safety: if onAuthStateChange never fires (e.g. no session at all),
    // force loading=false after 4s. Use refs to avoid stale closure.
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout after 4s – forcing loaded state');
        setLoading(false);
        // If role is still loading (not ready/error), mark as error
        if (roleStatusRef.current === 'loading' && roleRef.current === null) {
          updateRole(null, 'error');
        }
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      updateRole(null, 'loading');
      toast({
        title: t('auth.logoutSuccess'),
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [toast, t, updateRole]);

  const value: AuthContextType = {
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
