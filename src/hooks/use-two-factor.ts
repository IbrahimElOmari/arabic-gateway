import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiQuery, apiInvoke } from '@/lib/supabase-api';

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
    isEnabled: false, isRequired: false, method: null, backupCodesRemaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  const isRequired = role === 'admin' || role === 'teacher';

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiQuery<any>('user_two_factor', (q) => q.select('*').eq('user_id', user.id).maybeSingle());
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

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const setup = async (): Promise<SetupData | null> => {
    try {
      const data = await apiInvoke<SetupData>('verify-2fa', { action: 'setup' });
      setSetupData(data);
      return data;
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      return null;
    }
  };

  const verify = async (code: string): Promise<boolean> => {
    try {
      const response = await apiInvoke<{ verified: boolean }>('verify-2fa', { action: 'verify', code });
      if (response.verified) { await fetchStatus(); return true; }
      return false;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      return false;
    }
  };

  const disable = async (code: string): Promise<boolean> => {
    try {
      const response = await apiInvoke<{ disabled: boolean }>('verify-2fa', { action: 'disable', code });
      if (response.disabled) { await fetchStatus(); setSetupData(null); return true; }
      return false;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  };

  const useBackupCode = async (backupCode: string): Promise<boolean> => {
    try {
      const response = await apiInvoke<{ verified: boolean }>('verify-2fa', { action: 'use_backup', backupCode });
      if (response.verified) { await fetchStatus(); return true; }
      return false;
    } catch (error) {
      console.error('Error using backup code:', error);
      return false;
    }
  };

  return { status, loading, setupData, setup, verify, disable, useBackupCode, refresh: fetchStatus };
}
