import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '@/lib/utils';
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
}

export function AppSidebar({ collapsed, onToggle, mobile, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
  const { user, role, roleStatus } = useAuth();

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
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center px-2'
          )}
          activeClassName="bg-primary/10 text-primary font-medium"
          onClick={handleNavClick}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{item.label}</span>}
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
      <div className="border-t p-2 shrink-0">
        <div className={cn('flex items-center gap-1', collapsed ? 'flex-col px-0 py-1' : 'px-3 py-1')}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </aside>
  );
}
