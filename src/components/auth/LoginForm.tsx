import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { apiInvoke } from '@/lib/supabase-api';
import { useToast } from '@/hooks/use-toast';

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const { t } = useTranslation();

  const loginSchema = z.object({
    email: z.string().email(t('validation.invalidEmail', 'Invalid email address')),
    password: z.string().min(8, t('validation.passwordMin', 'Password must be at least 8 characters')),
  });
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      if (captchaRequired && captchaToken) {
        const result = await apiInvoke<{ success: boolean }>('verify-captcha', {
          token: captchaToken,
          action: 'login',
        });
        if (!result.success) {
          toast({
            variant: 'destructive',
            title: t('auth.captchaFailed', 'Captcha verification failed'),
          });
          setCaptchaToken(null);
          return;
        }
      }
      await signIn(data.email, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {t('auth.login')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('app.tagline')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <TurnstileWidget action="login" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (captchaRequired && !captchaToken)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.login')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link
          to="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          {t('auth.forgotPassword')}
        </Link>
        <p className="text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
