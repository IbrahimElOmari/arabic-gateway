import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const location = useLocation();
  const { t } = useTranslation();
  const registered = (location.state as { registered?: boolean })?.registered;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {registered && (
          <Alert className="border-primary/50 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              {t('auth2.checkEmail')}
            </AlertDescription>
          </Alert>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
