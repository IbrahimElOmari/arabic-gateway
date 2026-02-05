 import { useTranslation } from "react-i18next";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Progress } from "@/components/ui/progress";
 import { Badge } from "@/components/ui/badge";
 import { Loader2, TrendingUp, Target, Clock, Trophy } from "lucide-react";
 import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
 
 export function StudentProgressDashboard() {
   const { t, i18n } = useTranslation();
   const { user } = useAuth();
 
   // Fetch student progress by category
   const { data: categoryProgress, isLoading: progressLoading } = useQuery({
     queryKey: ["student-category-progress", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("student_progress")
         .select("*, category:exercise_categories(name, name_nl, name_en, name_ar)")
         .eq("student_id", user!.id);
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   // Fetch exercise attempts for score trends
   const { data: attempts } = useQuery({
     queryKey: ["student-attempts-trend", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("exercise_attempts")
         .select("total_score, submitted_at, passed")
         .eq("student_id", user!.id)
         .not("submitted_at", "is", null)
         .order("submitted_at", { ascending: true })
         .limit(20);
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   // Fetch user points
   const { data: userPoints } = useQuery({
     queryKey: ["user-points", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("user_points")
         .select("*")
         .eq("user_id", user!.id)
         .single();
       if (error && error.code !== "PGRST116") throw error;
       return data;
     },
     enabled: !!user,
   });
 
   // Fetch user badges
   const { data: userBadges } = useQuery({
     queryKey: ["user-badges", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("user_badges")
         .select("*, badge:badges(*)")
         .eq("user_id", user!.id);
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   const getCategoryName = (category: any) => {
     if (!category) return "";
     const lang = i18n.language;
     if (lang === "nl") return category.name_nl;
     if (lang === "ar") return category.name_ar;
     return category.name_en;
   };
 
   const scoreData = attempts?.map((a, i) => ({
     name: `${i + 1}`,
     score: a.total_score || 0,
     passed: a.passed,
   })) || [];
 
   const totalCompleted = categoryProgress?.reduce((sum, p) => sum + p.exercises_completed, 0) || 0;
   const totalExercises = categoryProgress?.reduce((sum, p) => sum + p.exercises_total, 0) || 0;
   const overallProgress = totalExercises > 0 ? (totalCompleted / totalExercises) * 100 : 0;
   const avgScore = categoryProgress?.length
     ? categoryProgress.reduce((sum, p) => sum + (p.average_score || 0), 0) / categoryProgress.length
     : 0;
 
   if (progressLoading) {
     return (
       <div className="flex justify-center py-12">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Overview Cards */}
       <div className="grid gap-4 md:grid-cols-4">
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.overallProgress", "Overall Progress")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5 text-primary" />
               <span className="text-2xl font-bold">{overallProgress.toFixed(0)}%</span>
             </div>
             <Progress value={overallProgress} className="mt-2" />
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.averageScore", "Average Score")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <Target className="h-5 w-5 text-green-500" />
               <span className="text-2xl font-bold">{avgScore.toFixed(0)}%</span>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.currentStreak", "Current Streak")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <Clock className="h-5 w-5 text-orange-500" />
               <span className="text-2xl font-bold">{userPoints?.current_streak || 0} {t("progress.days", "days")}</span>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.totalPoints", "Total Points")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <Trophy className="h-5 w-5 text-yellow-500" />
               <span className="text-2xl font-bold">{userPoints?.total_points || 0}</span>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Progress by Category */}
       <Card>
         <CardHeader>
           <CardTitle>{t("progress.byCategory", "Progress by Skill")}</CardTitle>
           <CardDescription>{t("progress.byCategoryDesc", "Your performance across different skill areas")}</CardDescription>
         </CardHeader>
         <CardContent>
           {categoryProgress && categoryProgress.length > 0 ? (
             <div className="space-y-4">
               {categoryProgress.map((progress) => {
                 const percent = progress.exercises_total > 0
                   ? (progress.exercises_completed / progress.exercises_total) * 100
                   : 0;
                 return (
                   <div key={progress.id} className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="font-medium">{getCategoryName(progress.category)}</span>
                       <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">
                           {progress.exercises_completed}/{progress.exercises_total}
                         </span>
                         <Badge variant={progress.average_score >= 70 ? "default" : "secondary"}>
                           {(progress.average_score || 0).toFixed(0)}%
                         </Badge>
                       </div>
                     </div>
                     <Progress value={percent} className="h-2" />
                   </div>
                 );
               })}
             </div>
           ) : (
             <p className="text-center text-muted-foreground py-8">
               {t("progress.noProgress", "Complete some exercises to see your progress")}
             </p>
           )}
         </CardContent>
       </Card>
 
       {/* Score Trend Chart */}
       {scoreData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>{t("progress.scoreTrend", "Score Trend")}</CardTitle>
             <CardDescription>{t("progress.scoreTrendDesc", "Your scores over time")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={scoreData}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis dataKey="name" className="text-xs" />
                   <YAxis domain={[0, 100]} className="text-xs" />
                   <Tooltip />
                   <Line
                     type="monotone"
                     dataKey="score"
                     stroke="hsl(var(--primary))"
                     strokeWidth={2}
                     dot={{ fill: "hsl(var(--primary))" }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Badges */}
       {userBadges && userBadges.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>{t("progress.earnedBadges", "Earned Badges")}</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex flex-wrap gap-3">
               {userBadges.map((ub) => (
                 <div
                   key={ub.id}
                   className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                   title={ub.badge?.description_en}
                 >
                   <span className="text-2xl">{ub.badge?.icon || "🏆"}</span>
                   <span className="text-sm font-medium">{ub.badge?.name_en}</span>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }