import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CreditCard,
  Percent,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: t("admin.dashboard", "Dashboard"), end: true },
    { to: "/admin/users", icon: Users, label: t("admin.users", "Users") },
    { to: "/admin/teachers", icon: UserCheck, label: t("admin.teacherApprovals", "Teacher Approvals") },
    { to: "/admin/classes", icon: BookOpen, label: t("admin.classes", "Classes") },
    { to: "/admin/levels", icon: Layers, label: t("admin.levels", "Levels") },
    { to: "/admin/placements", icon: ClipboardCheck, label: t("admin.placements", "Placements") },
    { to: "/admin/payments", icon: CreditCard, label: t("admin.payments", "Payments") },
    { to: "/admin/discounts", icon: Percent, label: t("admin.discounts", "Discounts") },
    { to: "/admin/faq", icon: BookOpen, label: t("admin.knowledgeBase", "Knowledge Base") },
    { to: "/admin/reports", icon: ClipboardCheck, label: t("admin.contentReports", "Reports") },
    { to: "/admin/invitations", icon: UserCheck, label: t("admin.invitations", "Invitations") },
    { to: "/admin/analytics", icon: BarChart3, label: t("admin.analytics", "Analytics") },
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
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <GraduationCap className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t("admin.backToApp", "Back to App")}</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
