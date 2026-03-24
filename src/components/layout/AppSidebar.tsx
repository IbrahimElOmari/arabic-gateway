import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiQuery } from '@/lib/supabase-api';
import {
  Home,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Video,
  MessageCircle,
  TrendingUp,
  Trophy,
  Settings,
  HelpCircle as HelpCircleIcon,
  LogIn,
  UserPlus,
  Palette,
  FileCheck,
  Users,
  School,
  Layers,
  CreditCard,
  Percent,
  BarChart3,
  Mail,
  GraduationCap,
  UserCheck,
  ClipboardList,
  Flag,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badge?: number;
}

export function AppSidebar({ collapsed, onToggle, mobile, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
  const { user, role, roleStatus } = useAuth();

  // Fetch pending enrollment count for admin badge
  const { data: pendingEnrollmentCount } = useQuery({
    queryKey: ['pending-enrollment-count'],
    queryFn: async () => {
      const data = await apiQuery<any[]>('class_enrollments', (q) =>
        q.select('id').eq('status', 'pending')
      );
      return data?.length || 0;
    },
    enabled: !!user && role === 'admin',
    refetchInterval: 30000, // refresh every 30s
  });

  const publicItems: NavItem[] = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/faq', icon: HelpCircleIcon, label: t('nav.knowledgeBase', 'FAQ') },
    { to: '/pricing', icon: DollarSign, label: t('nav.pricing', 'Pricing') },
  ];

  const guestItems: NavItem[] = [
    { to: '/login', icon: LogIn, label: t('auth.login') },
    { to: '/register', icon: UserPlus, label: t('auth.register') },
  ];

  const getDashboardLink = (): NavItem => {
    if (role === 'admin') return { to: '/admin', icon: LayoutDashboard, label: t('nav.dashboard'), end: true };
    if (role === 'teacher') return { to: '/teacher', icon: LayoutDashboard, label: t('nav.dashboard'), end: true };
    return { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), end: true };
  };

  const studentItems: NavItem[] = [
    getDashboardLink(),
    { to: '/self-study', icon: BookOpen, label: t('nav.selfStudy') },
    { to: '/live-lessons', icon: Video, label: t('nav.liveLessons') },
    { to: '/recordings', icon: Video, label: t('nav.recordings', 'Recordings') },
    { to: '/forum', icon: MessageCircle, label: t('nav.forum') },
    { to: '/chat', icon: MessageCircle, label: t('nav.chat', 'Chat') },
    { to: '/calendar', icon: Calendar, label: t('nav.calendar') },
    { to: '/progress', icon: TrendingUp, label: t('nav.progress') },
    { to: '/gamification', icon: Trophy, label: t('nav.gamification', 'Gamification') },
    { to: '/helpdesk', icon: HelpCircleIcon, label: t('nav.helpdesk', 'Helpdesk') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const teacherItems: NavItem[] = [
    { to: '/teacher', icon: LayoutDashboard, label: t('teacher.dashboard', 'Teacher Dashboard'), end: true },
    { to: '/teacher/content-studio', icon: Palette, label: t('teacher.contentStudio', 'Content Studio') },
    { to: '/teacher/lessons', icon: Calendar, label: t('teacher.lessons', 'Lessons') },
    { to: '/teacher/recordings', icon: Video, label: t('teacher.recordings', 'Recordings') },
    { to: '/teacher/exercises', icon: BookOpen, label: t('teacher.exercises', 'Exercises') },
    { to: '/teacher/materials', icon: FileCheck, label: t('teacher.materials', 'Materials') },
    { to: '/teacher/submissions', icon: Users, label: t('teacher.submissions', 'Submissions') },
  ];

  const adminItems: NavItem[] = [
    { to: '/admin', icon: LayoutDashboard, label: t('admin.dashboard', 'Admin Dashboard'), end: true },
    { to: '/admin/users', icon: Users, label: t('admin.users', 'Users') },
    { to: '/admin/teachers', icon: UserCheck, label: t('admin.teacherApprovals', 'Teacher Approvals') },
    { to: '/admin/classes', icon: School, label: t('admin.classes', 'Classes') },
    { to: '/admin/enrollments', icon: UserPlus, label: t('admin.enrollmentRequests', 'Inschrijvingsaanvragen'), badge: pendingEnrollmentCount || 0 },
    { to: '/admin/levels', icon: Layers, label: t('admin.levels', 'Levels') },
    { to: '/admin/placements', icon: ClipboardList, label: t('admin.placements', 'Placements') },
    { to: '/admin/payments', icon: CreditCard, label: t('admin.payments', 'Payments') },
    { to: '/admin/discounts', icon: Percent, label: t('admin.discounts', 'Discounts') },
    { to: '/admin/faq', icon: HelpCircleIcon, label: t('admin.knowledgeBase', 'Knowledge Base') },
    { to: '/admin/reports', icon: Flag, label: t('admin.contentReports', 'Reports') },
    { to: '/admin/invitations', icon: Mail, label: t('admin.invitations', 'Invitations') },
    { to: '/admin/analytics', icon: BarChart3, label: t('admin.analytics', 'Analytics') },
    { to: '/admin/final-exams', icon: GraduationCap, label: t('admin.finalExams', 'Final Exams') },
  ];

  const handleNavClick = () => {
    if (mobile && onNavigate) {
      onNavigate();
    }
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="mb-2" key={title}>
      {!collapsed && (
        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={cn(
            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center px-2'
          )}
          activeClassName="bg-primary/10 text-primary font-medium"
          onClick={handleNavClick}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <span className="truncate flex-1">{item.label}</span>
          )}
          {!collapsed && item.badge !== undefined && item.badge > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
              {item.badge}
            </Badge>
          )}
          {collapsed && item.badge !== undefined && item.badge > 0 && (
            <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full" />
          )}
          {collapsed && <span className="sr-only">{item.label}</span>}
        </NavLink>
      ))}
    </div>
  );

  const isRoleResolved = roleStatus === 'ready' && role !== null;

  // On mobile, render without the fixed positioning (Sheet handles positioning)
  const sidebarClasses = mobile
    ? 'h-full bg-card flex flex-col'
    : cn(
        'fixed start-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      );

  return (
    <aside className={sidebarClasses}>
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3 shrink-0">
        {!collapsed && !mobile && <Logo size="sm" showText />}
        {mobile && <Logo size="sm" showText />}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('shrink-0', collapsed && 'mx-auto')}
            aria-label={collapsed ? t('accessibility.expandSidebar', 'Expand sidebar') : t('accessibility.collapseSidebar', 'Collapse sidebar')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {renderSection(t('nav.general', 'General'), publicItems)}

        {!user && renderSection(t('nav.account', 'Account'), guestItems)}

        {user && isRoleResolved && role === 'student' && (
          renderSection(t('nav.learning', 'Learning'), studentItems)
        )}

        {user && isRoleResolved && role === 'teacher' && (
          <>
            {renderSection(t('nav.learning', 'Learning'), studentItems)}
            {renderSection(t('nav.teaching', 'Teaching'), teacherItems)}
          </>
        )}

        {user && isRoleResolved && role === 'admin' && (
          <>
            {renderSection(t('nav.learning', 'Learning'), studentItems)}
            {renderSection(t('nav.teaching', 'Teaching'), teacherItems)}
            {renderSection(t('nav.administration', 'Administration'), adminItems)}
          </>
        )}

        {user && !isRoleResolved && (
          renderSection(t('nav.account', 'Account'), [
            { to: '/settings', icon: Settings, label: t('nav.settings') },
          ])
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-2 shrink-0 space-y-2">
        {/* User profile area */}
        {user && (
          <div className={cn('flex items-center gap-2', collapsed ? 'flex-col px-0 py-1' : 'px-3 py-1')}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                {role && (
                  <Badge
                    variant={role === 'admin' ? 'destructive' : role === 'teacher' ? 'default' : 'secondary'}
                    className="text-[10px] h-4 px-1"
                  >
                    {role === 'admin' ? t('roles.admin', 'Beheerder') : role === 'teacher' ? t('roles.teacher', 'Leerkracht') : t('roles.student', 'Student')}
                  </Badge>
                )}
              </div>
            )}
            <NotificationBell />
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={async () => {
                  const { useAuth } = await import('@/contexts/AuthContext');
                  // signOut is already available via the outer scope
                  await signOut();
                }}
                aria-label={t('auth.logout', 'Uitloggen')}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className={cn('flex items-center gap-1', collapsed ? 'flex-col px-0 py-1' : 'px-3 py-1')}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </aside>
  );
}
