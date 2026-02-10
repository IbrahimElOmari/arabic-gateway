import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, User, Settings, LogOut, TrendingUp, Shield, Palette } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { t } = useTranslation();
  const { user, profile, role, signOut, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/" className="text-lg font-semibold">
                  {t('nav.home')}
                </Link>
                {user && (
                  <>
                    <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                      {t('nav.dashboard')}
                    </Link>
                    <Link to="/self-study" className="text-muted-foreground hover:text-foreground">
                      {t('nav.selfStudy')}
                    </Link>
                    <Link to="/live-lessons" className="text-muted-foreground hover:text-foreground">
                      {t('nav.liveLessons')}
                    </Link>
                    <Link to="/forum" className="text-muted-foreground hover:text-foreground">
                      {t('nav.forum')}
                    </Link>
                    {/* Management links for admin/teacher in mobile */}
                    {(role === 'admin' || role === 'teacher') && (
                      <div className="border-t pt-4 mt-2">
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                          {t('nav.management', 'Beheer')}
                        </p>
                        <Link 
                          to="/teacher/content-studio" 
                          className="flex items-center gap-2 text-primary hover:text-primary/80"
                          data-testid="mobile-content-studio-link"
                        >
                          <Palette className="h-4 w-4" />
                          {t('nav.contentStudio', 'Content Studio')}
                        </Link>
                        {role === 'admin' && (
                          <Link 
                            to="/admin" 
                            className="flex items-center gap-2 text-primary hover:text-primary/80 mt-2"
                            data-testid="mobile-admin-link"
                          >
                            <Shield className="h-4 w-4" />
                            {t('nav.adminPanel', 'Beheerderspaneel')}
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">HVA</span>
          <span className="hidden sm:inline-block text-sm font-medium">
            {t('app.name')}
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 mx-6">
          {user && (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                to="/self-study"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.selfStudy')}
              </Link>
              <Link
                to="/live-lessons"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.liveLessons')}
              </Link>
              <Link
                to="/forum"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.forum')}
              </Link>
              {/* Management links - using role directly for reliability */}
              {(role === 'admin' || role === 'teacher') && (
                <>
                  <Link
                    to="/teacher/content-studio"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    data-testid="header-content-studio-link"
                  >
                    <Palette className="h-4 w-4" />
                    {t('nav.contentStudio', 'Content Studio')}
                  </Link>
                  {role === 'admin' && (
                    <Link
                      to="/admin"
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      data-testid="header-admin-link"
                    >
                      <Shield className="h-4 w-4" />
                      {t('nav.admin', 'Beheer')}
                    </Link>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center space-x-2">
          <LanguageSwitcher />
          <ThemeSwitcher />

          {user ? (
            <div className="flex items-center gap-2">
              {/* Role badge - always visible */}
              {role && (
                <Badge variant={getRoleBadgeVariant()} className="hidden sm:inline-flex text-xs">
                  {getRoleLabel()}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {role && (
                        <Badge variant={getRoleBadgeVariant()} className="w-fit mt-1 text-xs">
                          {getRoleLabel()}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/progress')}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t('nav.progress')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('nav.settings')}
                  </DropdownMenuItem>
                  {/* Management links in dropdown - using role directly */}
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
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
              <Button asChild>
                <Link to="/register">{t('auth.register')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
