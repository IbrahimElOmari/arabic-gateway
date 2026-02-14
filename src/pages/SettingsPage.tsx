import React, { useState, useRef, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, User, Bell, Palette, Sun, Moon, Monitor, Briefcase, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const { theme, setTheme, themeStyle, setThemeStyle } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [lessonReminders, setLessonReminders] = useState(true);
  const [exerciseNotifications, setExerciseNotifications] = useState(true);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, address })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: t('settings.profileSaved', 'Profile saved successfully') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: t('settings.passwordUpdated', 'Password updated successfully') });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  // Avatar upload
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: t('settings.avatarUpdated', 'Avatar updated') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarUploadMutation.mutate(file);
  };

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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploadMutation.isPending}
                  >
                    {avatarUploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t('settings.changeAvatar')}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('settings.fullName')}</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.email')}</Label>
                    <Input defaultValue={profile?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.phone')}</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.address')}</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={() => saveProfileMutation.mutate()}
                  disabled={saveProfileMutation.isPending}
                >
                  {saveProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('settings.saveChanges')}
                </Button>
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
                  <Label>{t('settings.newPassword')}</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.confirmPassword')}</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                >
                  {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('settings.updatePassword')}
                </Button>
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
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.lessonReminders')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.lessonRemindersDescription')}
                    </p>
                  </div>
                  <Switch checked={lessonReminders} onCheckedChange={setLessonReminders} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('settings.exerciseNotifications')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.exerciseNotificationsDescription')}
                    </p>
                  </div>
                  <Switch checked={exerciseNotifications} onCheckedChange={setExerciseNotifications} />
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