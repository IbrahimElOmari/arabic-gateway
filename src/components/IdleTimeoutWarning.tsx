import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCallback } from 'react';

export function IdleTimeoutWarning() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleTimeout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  const { showWarning, dismiss } = useIdleTimeout(
    30 * 60 * 1000, // 30 min
    2 * 60 * 1000,   // 2 min warning
    handleTimeout
  );

  if (!user) return null;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('session.timeoutTitle', 'Session Expiring')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'session.timeoutMessage',
              'You have been inactive. You will be logged out in 2 minutes. Click below to stay logged in.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={dismiss}>
            {t('session.stayLoggedIn', 'Stay Logged In')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
