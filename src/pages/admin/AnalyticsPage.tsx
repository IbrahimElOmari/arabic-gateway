import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  TrendingUp,
  Activity,
  Eye,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AnalyticsPage() {
  const { t } = useTranslation();

  // Fetch daily stats for the last 30 days
  const { data: dailyStats } = useQuery({
    queryKey: ["admin-analytics-daily"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("analytics_daily_stats")
        .select("*")
        .gte("stat_date", thirtyDaysAgo)
        .order("stat_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch aggregated stats
  const { data: aggregatedStats } = useQuery({
    queryKey: ["admin-analytics-aggregated"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

      const [todayStats, weekStats, totalUsers, totalExercises] = await Promise.all([
        supabase
          .from("analytics_daily_stats")
          .select("*")
          .eq("stat_date", today)
          .maybeSingle(),
        supabase
          .from("analytics_daily_stats")
          .select("*")
          .gte("stat_date", sevenDaysAgo),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("exercise_attempts").select("*", { count: "exact", head: true }),
      ]);

      const weekData = weekStats.data || [];
      const weekTotals = weekData.reduce(
        (acc, day) => ({
          pageViews: acc.pageViews + (day.page_views || 0),
          exercisesStarted: acc.exercisesStarted + (day.exercises_started || 0),
          exercisesCompleted: acc.exercisesCompleted + (day.exercises_completed || 0),
          lessonsAttended: acc.lessonsAttended + (day.lessons_attended || 0),
          newUsers: acc.newUsers + (day.new_users || 0),
          activeUsers: acc.activeUsers + (day.active_users || 0),
        }),
        { pageViews: 0, exercisesStarted: 0, exercisesCompleted: 0, lessonsAttended: 0, newUsers: 0, activeUsers: 0 }
      );

      return {
        today: todayStats.data,
        week: weekTotals,
        totalUsers: totalUsers.count || 0,
        totalExerciseAttempts: totalExercises.count || 0,
      };
    },
  });

  // Fetch popular pages from analytics events
  const { data: popularPages } = useQuery({
    queryKey: ["admin-analytics-pages"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("page_path")
        .gte("created_at", sevenDaysAgo)
        .eq("event_type", "page_view")
        .not("page_path", "is", null);

      if (error) throw error;

      // Count page views per path
      const pageCounts: Record<string, number> = {};
      (data || []).forEach((event) => {
        if (event.page_path) {
          pageCounts[event.page_path] = (pageCounts[event.page_path] || 0) + 1;
        }
      });

      // Sort and take top 10
      return Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch feature usage
  const { data: featureUsage } = useQuery({
    queryKey: ["admin-analytics-features"],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("feature_usage")
        .select("*")
        .gte("usage_date", sevenDaysAgo);

      if (error) throw error;

      // Aggregate by feature
      const featureTotals: Record<string, number> = {};
      (data || []).forEach((row) => {
        featureTotals[row.feature_name] = (featureTotals[row.feature_name] || 0) + row.usage_count;
      });

      return Object.entries(featureTotals)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Format daily stats for charts
  const chartData = (dailyStats || []).map((day) => ({
    date: format(new Date(day.stat_date), "dd/MM"),
    pageViews: day.page_views,
    activeUsers: day.active_users,
    exercisesStarted: day.exercises_started,
    exercisesCompleted: day.exercises_completed,
    lessonsAttended: day.lessons_attended,
    newUsers: day.new_users,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.analytics", "Analytics")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.analyticsDescription", "View platform statistics and user behavior")}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalUsers", "Total Users")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{aggregatedStats?.week?.newUsers || 0} {t("admin.last7Days", "last 7 days")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.pageViews", "Page Views")}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.week?.pageViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.last7Days", "Last 7 days")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.exercisesCompleted", "Exercises Completed")}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.week?.exercisesCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">
              {aggregatedStats?.week?.exercisesStarted || 0} {t("admin.exercisesStarted", "started")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.lessonsAttended", "Lessons Attended")}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.week?.lessonsAttended || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.last7Days", "Last 7 days")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">
            <Activity className="mr-2 h-4 w-4" />
            {t("admin.userEngagement", "User Engagement")}
          </TabsTrigger>
          <TabsTrigger value="exercises">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("categories.exercises", "Exercises")}
          </TabsTrigger>
          <TabsTrigger value="pages">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t("admin.popularPages", "Popular Pages")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.activeUsersToday", "Active Users Over Time")}</CardTitle>
              <CardDescription>{t("admin.last30Days", "Last 30 days")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    name={t("admin.activeUsersToday", "Active Users")}
                  />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary) / 0.2)"
                    name={t("admin.newUsersToday", "New Users")}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.exercisesCompleted", "Exercise Activity")}</CardTitle>
              <CardDescription>{t("admin.last30Days", "Last 30 days")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar
                    dataKey="exercisesStarted"
                    fill="hsl(var(--primary) / 0.5)"
                    name={t("admin.exercisesStarted", "Started")}
                  />
                  <Bar
                    dataKey="exercisesCompleted"
                    fill="hsl(var(--primary))"
                    name={t("admin.exercisesCompleted", "Completed")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.popularPages", "Popular Pages")}</CardTitle>
                <CardDescription>{t("admin.last7Days", "Last 7 days")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(popularPages || []).length > 0 ? (
                    popularPages?.map((page, index) => (
                      <div key={page.path} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {page.path}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {page.count} {t("admin.pageViews", "views")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t("common.noData", "No data available")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.featureUsage", "Feature Usage")}</CardTitle>
                <CardDescription>{t("admin.last7Days", "Last 7 days")}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {(featureUsage || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={featureUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                        label={({ name }) => name}
                      >
                        {featureUsage?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      {t("common.noData", "No data available")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Today's Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("calendar.today", "Today")}
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center">
              <p className="text-2xl font-bold">{aggregatedStats?.today?.active_users || 0}</p>
              <p className="text-xs text-muted-foreground">{t("admin.activeUsersToday", "Active Users")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{aggregatedStats?.today?.new_users || 0}</p>
              <p className="text-xs text-muted-foreground">{t("admin.newUsersToday", "New Users")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{aggregatedStats?.today?.page_views || 0}</p>
              <p className="text-xs text-muted-foreground">{t("admin.pageViews", "Page Views")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{aggregatedStats?.today?.exercises_completed || 0}</p>
              <p className="text-xs text-muted-foreground">{t("admin.exercisesCompleted", "Exercises")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{aggregatedStats?.today?.lessons_attended || 0}</p>
              <p className="text-xs text-muted-foreground">{t("admin.lessonsAttended", "Lessons")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
