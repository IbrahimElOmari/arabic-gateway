import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Smartphone, Tablet, Monitor, Share2, 
  CheckCircle, Apple, Play, Wifi, WifiOff, Bell
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect device type
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) {
      setDeviceType('mobile');
    } else if (/Tablet|iPad/i.test(ua)) {
      setDeviceType('tablet');
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    // Detect Android
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const DeviceIcon = deviceType === 'mobile' ? Smartphone : deviceType === 'tablet' ? Tablet : Monitor;

  return (
    <MainLayout>
      <div className="container max-w-2xl py-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
            <Download className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{t('install.title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('install.description')}
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{t('install.connectionStatus')}</p>
                  <p className="text-sm text-muted-foreground">
                    {isOnline ? t('install.online') : t('install.offline')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <DeviceIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('install.deviceType')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`install.device.${deviceType}`)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Install Status */}
        {isInstalled ? (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              {t('install.alreadyInstalled')}
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              {t('install.alreadyInstalledDescription')}
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('install.howToInstall')}</CardTitle>
              <CardDescription>{t('install.howToInstallDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Android / Chrome - Automatic install prompt */}
              {deferredPrompt && (
                <div className="space-y-4">
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    {t('install.installNow')}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    {t('install.oneClick')}
                  </p>
                </div>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Apple className="h-6 w-6" />
                    <span className="font-medium">{t('install.iosInstructions')}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="bg-muted px-2 py-0.5 rounded">1</span>
                      <span>{t('install.ios.step1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-muted px-2 py-0.5 rounded">2</span>
                      <span className="flex items-center gap-1">
                        {t('install.ios.step2')} <Share2 className="h-4 w-4" />
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-muted px-2 py-0.5 rounded">3</span>
                      <span>{t('install.ios.step3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-muted px-2 py-0.5 rounded">4</span>
                      <span>{t('install.ios.step4')}</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Android without prompt */}
              {isAndroid && !deferredPrompt && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Play className="h-6 w-6" />
                    <span className="font-medium">{t('install.androidInstructions')}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>{t('install.android.step1')}</li>
                    <li>{t('install.android.step2')}</li>
                    <li>{t('install.android.step3')}</li>
                  </ol>
                </div>
              )}

              {/* Desktop */}
              {deviceType === 'desktop' && !deferredPrompt && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-6 w-6" />
                    <span className="font-medium">{t('install.desktopInstructions')}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>{t('install.desktop.step1')}</li>
                    <li>{t('install.desktop.step2')}</li>
                    <li>{t('install.desktop.step3')}</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>{t('install.features')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <WifiOff className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('install.feature.offline')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('install.feature.offlineDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('install.feature.notifications')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('install.feature.notificationsDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('install.feature.native')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('install.feature.nativeDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('install.feature.fast')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('install.feature.fastDescription')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Native App Coming Soon */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="p-2 bg-background rounded-lg">
                  <Apple className="h-6 w-6" />
                </div>
                <div className="p-2 bg-background rounded-lg">
                  <Play className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="font-medium">{t('install.nativeAppSoon')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('install.nativeAppSoonDescription')}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {t('install.comingSoon')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
