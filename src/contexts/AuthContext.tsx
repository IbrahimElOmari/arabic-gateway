import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

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

  // Refs for latest-wins and stale-closure avoidance
  const roleRequestId = useRef(0);
  const roleRef = useRef<AppRole | null>(null);

  const updateRole = useCallback((newRole: AppRole | null, newStatus: RoleStatus) => {
    roleRef.current = newRole;
    setRole(newRole);
    setRoleStatus(newStatus);
  }, []);

  // ── Effect A: Auth listener (SYNCHRONOUS — no await inside callback) ──
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        logger.log('[Auth] event:', event, 'user:', !!currentSession?.user);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          updateRole(null, 'loading');
          setLoading(false);
          return;
        }

        // For ALL other events: just sync session/user synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (!currentSession?.user) {
          setProfile(null);
          updateRole(null, 'loading');
        }

        // For INITIAL_SESSION and SIGNED_IN, mark auth as loaded
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setLoading(false);
        }
      }
    );

    // Safety: if INITIAL_SESSION never fires (no session), force loaded after 3s
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        logger.warn('[Auth] Safety timeout – forcing loaded');
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect B: Combined role + profile resolution via single RPC ──
  useEffect(() => {
    if (!user) {
      updateRole(null, 'loading');
      setProfile(null);
      return;
    }

    // If role already resolved for this user, don't re-fetch
    if (roleRef.current !== null) {
      return;
    }

    const currentRequestId = ++roleRequestId.current;
    updateRole(null, 'loading');

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled && currentRequestId === roleRequestId.current) {
        logger.error('[Auth] Role resolution timeout');
        updateRole(null, 'error');
      }
    }, 5000);

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_with_context', { _user_id: user.id });
        if (cancelled || currentRequestId !== roleRequestId.current) return;

        clearTimeout(timeoutId);

        if (error) {
          logger.error('[Auth] Context RPC error:', error);
          updateRole(null, 'error');
          return;
        }

        const ctx = data as unknown as { role: AppRole | null; profile: Profile | null } | null;

        // Handle profile
        if (ctx?.profile) {
          setProfile(ctx.profile);
          if (ctx.profile.preferred_language && ctx.profile.preferred_language !== i18n.language) {
            i18n.changeLanguage(ctx.profile.preferred_language);
          }
        }

        // Handle role
        if (ctx?.role) {
          updateRole(ctx.role, 'ready');
        } else {
          logger.warn('[Auth] No role found for user');
          updateRole(null, 'error');
        }
      } catch (err) {
        if (cancelled || currentRequestId !== roleRequestId.current) return;
        clearTimeout(timeoutId);
        logger.error('[Auth] Context fetch exception:', err);
        updateRole(null, 'error');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const retryRoleResolution = useCallback(() => {
    if (!user) return;
    roleRef.current = null;
    const currentRequestId = ++roleRequestId.current;
    updateRole(null, 'loading');

    const timeoutId = setTimeout(() => {
      if (currentRequestId === roleRequestId.current) {
        updateRole(null, 'error');
      }
    }, 5000);

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_with_context', { _user_id: user.id });
        if (currentRequestId !== roleRequestId.current) return;
        clearTimeout(timeoutId);

        const ctx = data as unknown as { role: AppRole | null; profile: Profile | null } | null;

        if (error || !ctx?.role) {
          updateRole(null, 'error');
          return;
        }

        if (ctx.profile) setProfile(ctx.profile);
        updateRole(ctx.role, 'ready');
      } catch {
        if (currentRequestId === roleRequestId.current) {
          clearTimeout(timeoutId);
          updateRole(null, 'error');
        }
      }
    })();
  }, [user, updateRole]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) setProfile(data);
    } catch (err) {
      logger.error('[Auth] refreshProfile error:', err);
    }
  }, [user]);

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

      toast({ title: t('auth.loginSuccess') });
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
      roleRef.current = null;
      updateRole(null, 'loading');
      setProfile(null);
      await supabase.auth.signOut();
      toast({ title: t('auth.logoutSuccess') });
    } catch (error) {
      logger.error('Error signing out:', error);
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
