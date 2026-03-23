import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/date-utils";
import { StatsCard } from "@/components/admin/StatsCard";
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  UserCheck,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, classes, enrollments, applications] = await Promise.all([
        apiQuery<any[]>("profiles", (q) => q.select("id").limit(1000)),
        apiQuery<any[]>("classes", (q) => q.select("id")),
        apiQuery<any[]>("class_enrollments", (q) => q.select("id").eq("status", "enrolled")),
        apiQuery<any[]>("teacher_applications", (q) => q.select("id").eq("status", "pending")),
      ]);
      return {
        totalUsers: profiles?.length || 0,
        totalClasses: classes?.length || 0,
        activeEnrollments: enrollments?.length || 0,
        pendingTeachers: applications?.length || 0,
      };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: () => apiQuery<any[]>("admin_activity_log", (q) =>
      q.select("*").order("created_at", { ascending: false }).limit(5)
    ),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.dashboard", "Admin Dashboard")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.dashboardDescription", "Overview of your platform statistics")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("admin.totalUsers", "Total Users")}
          value={stats?.totalUsers || 0}
          icon={Users}
          description={t("admin.registeredUsers", "Registered users")}
        />
        <StatsCard
          title={t("admin.activeClasses", "Active Classes")}
          value={stats?.totalClasses || 0}
          icon={BookOpen}
          description={t("admin.totalClasses", "Total classes")}
        />
        <StatsCard
          title={t("admin.enrollments", "Enrollments")}
          value={stats?.activeEnrollments || 0}
          icon={GraduationCap}
          description={t("admin.activeEnrollments", "Active enrollments")}
        />
        <StatsCard
          title={t("admin.pendingApprovals", "Pending Approvals")}
          value={stats?.pendingTeachers || 0}
          icon={UserCheck}
          description={t("admin.teacherApplications", "Teacher applications")}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("admin.recentActivity", "Recent Activity")}
            </CardTitle>
            <CardDescription>
              {t("admin.latestActions", "Latest administrative actions")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.target_table}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(activity.created_at, "PPP")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {t("admin.noRecentActivity", "No recent activity")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("admin.paymentStatus", "Payment Status")}
            </CardTitle>
            <CardDescription>
              {t("admin.paymentDescription", "Payment system is ready for Stripe integration")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/20">
                <CreditCard className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">
                {t("admin.stripeNotConfigured", "Stripe Not Configured")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                {t(
                  "admin.stripeDescription",
                  "Add your Stripe API key to enable payment processing. Manual payments are available."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
