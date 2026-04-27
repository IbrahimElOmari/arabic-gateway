import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, Settings, LogOut, TrendingUp, Shield, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function UserAvatarMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();

  if (!user) return null;

  const getRoleBadgeVariant = () => {
    if (role === 'admin') return 'destructive' as const;
    if (role === 'teacher') return 'default' as const;
    return 'secondary' as const;
  };

  const getRoleLabel = () => {
    if (role === 'admin') return t('roles.admin', 'Beheerder');
    if (role === 'teacher') return t('roles.teacher', 'Leerkracht');
    if (role === 'student') return t('roles.student', 'Student');
    return '';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label={t('nav.profile', 'Profiel')}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="text-xs">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            {role && (
              <Badge variant={getRoleBadgeVariant()} className="w-fit mt-1 text-xs">
                {getRoleLabel()}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <User className="mr-2 h-4 w-4" />
          {t('nav.profile', 'Profiel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/progress')}>
          <TrendingUp className="mr-2 h-4 w-4" />
          {t('nav.progress', 'Voortgang')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          {t('nav.settings', 'Instellingen')}
        </DropdownMenuItem>
        {(role === 'admin' || role === 'teacher') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/teacher/content-studio')}>
              <Palette className="mr-2 h-4 w-4" />
              {t('nav.contentStudio', 'Content Studio')}
            </DropdownMenuItem>
            {role === 'admin' && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                {t('nav.adminPanel', 'Beheerderspaneel')}
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('auth.logout', 'Uitloggen')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileSheetSide = i18n.dir() === 'rtl' ? 'right' : 'left';

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
        >
          {t('accessibility.skipToMain', 'Skip to main content')}
        </a>

        <OfflineBanner />

        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 h-14 border-b bg-card flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label={t('accessibility.openMenu', 'Open menu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo size="sm" showText />
          <div className="flex-1" />
          {user && <NotificationBell />}
          <UserAvatarMenu />
        </div>

        {/* Mobile sidebar sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side={mobileSheetSide} className="p-0 w-64 [&>button]:hidden">
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main
          id="main-content"
          className="min-h-screen pt-14"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToMain', 'Skip to main content')}
      </a>
      <OfflineBanner />
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        id="main-content"
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ms-16' : 'ms-64'
        )}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
