import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, User, Bell, Palette, Sun, Moon, Monitor, Briefcase, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { theme, setTheme, themeStyle, setThemeStyle } = useTheme();

  return (
    <MainLayout>
      <div className="container py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.security')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.appearance')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileInfo')}</CardTitle>
                <CardDescription>{t('settings.profileDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline">{t('settings.changeAvatar')}</Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('settings.fullName')}</Label>
                    <Input defaultValue={profile?.full_name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.email')}</Label>
                    <Input defaultValue={profile?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.phone')}</Label>
                    <Input defaultValue={profile?.phone || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.address')}</Label>
                    <Input defaultValue={profile?.address || ''} />
                  </div>
                </div>

                <Button>{t('settings.saveChanges')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <TwoFactorSetup />

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.password')}</CardTitle>
                <CardDescription>{t('settings.passwordDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.currentPassword')}</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.newPassword')}</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.confirmPassword')}</Label>
                  <Input type="password" />
                </div>
                <Button>{t('settings.updatePassword')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notificationPreferences')}</CardTitle>
                <CardDescription>{t('settings.notificationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.emailNotifications')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.emailNotificationsDescription')}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.lessonReminders')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.lessonRemindersDescription')}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.exerciseNotifications')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.exerciseNotificationsDescription')}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.appearanceSettings', 'Appearance Settings')}</CardTitle>
                <CardDescription>{t('settings.appearanceDescription', 'Customize how the app looks')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color Theme */}
                <div className="space-y-3">
                  <Label>{t('settings.colorTheme', 'Color Theme')}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? "default" : "outline"}
                      onClick={() => setTheme('light')}
                      className="flex items-center gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      {t('settings.themeLight', 'Light')}
                    </Button>
                    <Button
                      variant={theme === 'dark' ? "default" : "outline"}
                      onClick={() => setTheme('dark')}
                      className="flex items-center gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      {t('settings.themeDark', 'Dark')}
                    </Button>
                    <Button
                      variant={theme === 'system' ? "default" : "outline"}
                      onClick={() => setTheme('system')}
                      className="flex items-center gap-2"
                    >
                      <Monitor className="h-4 w-4" />
                      {t('settings.themeSystem', 'System')}
                    </Button>
                  </div>
                </div>

                {/* Style Theme */}
                <div className="space-y-3">
                  <Label>{t('settings.themeStyle', 'Style')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.styleThemeDescription', 'Choose between a clean professional look or a more playful design')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Card 
                      className={`cursor-pointer p-4 transition-all ${
                        themeStyle === 'professional' 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setThemeStyle('professional')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{t('settings.professional', 'Professional')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.professionalDescription', 'Clean, minimal interface')}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Card 
                      className={`cursor-pointer p-4 transition-all ${
                        themeStyle === 'playful' 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setThemeStyle('playful')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/20">
                          <Sparkles className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{t('settings.playful', 'Playful')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.playfulDescription', 'Rounded, colorful design')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
