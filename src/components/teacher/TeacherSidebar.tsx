import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  FileCheck,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

interface TeacherSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function TeacherSidebar({ collapsed, onToggle }: TeacherSidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { to: "/teacher", icon: LayoutDashboard, label: t("teacher.dashboard", "Dashboard"), end: true },
    { to: "/teacher/content-studio", icon: Palette, label: t("teacher.contentStudio", "Content Studio") },
    { to: "/teacher/lessons", icon: Calendar, label: t("teacher.lessons", "Lessons") },
    { to: "/teacher/recordings", icon: Video, label: t("teacher.recordings", "Recordings") },
    { to: "/teacher/exercises", icon: BookOpen, label: t("teacher.exercises", "Exercises") },
    { to: "/teacher/materials", icon: FileCheck, label: t("teacher.materials", "Materials") },
    { to: "/teacher/submissions", icon: Users, label: t("teacher.submissions", "Submissions") },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && <Logo size="sm" showText={false} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("shrink-0", collapsed && "mx-auto")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <NavLink
            to="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <GraduationCap className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t("teacher.backToApp", "Back to App")}</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
