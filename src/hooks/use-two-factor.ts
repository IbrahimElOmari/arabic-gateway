import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TwoFactorStatus {
  isEnabled: boolean;
  isRequired: boolean;
  method: string | null;
  backupCodesRemaining: number;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export function useTwoFactor() {
  const { user, role } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus>({
    isEnabled: false,
    isRequired: false,
    method: null,
    backupCodesRemaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  const isRequired = role === 'admin' || role === 'teacher';

  const fetchStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_two_factor')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setStatus({
        isEnabled: data?.is_enabled || false,
        isRequired,
        method: data?.method || null,
        backupCodesRemaining: data?.backup_codes?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isRequired]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const setup = async (): Promise<SetupData | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('verify-2fa', {
        body: { action: 'setup' },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const data = response.data as SetupData;
      setSetupData(data);
      return data;
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      return null;
    }
  };

  const verify = async (code: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('verify-2fa', {
        body: { action: 'verify', code },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.verified) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      return false;
    }
  };

  const disable = async (code: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('verify-2fa', {
        body: { action: 'disable', code },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.disabled) {
        await fetchStatus();
        setSetupData(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  };

  const useBackupCode = async (backupCode: string): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('verify-2fa', {
        body: { action: 'use_backup', backupCode },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.verified) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error using backup code:', error);
      return false;
    }
  };

  return {
    status,
    loading,
    setupData,
    setup,
    verify,
    disable,
    useBackupCode,
    refresh: fetchStatus,
  };
}
