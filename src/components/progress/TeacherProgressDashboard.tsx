 import { useTranslation } from "react-i18next";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Loader2, Users, TrendingUp, Target, BookOpen } from "lucide-react";
 import { useState } from "react";
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
 
 export function TeacherProgressDashboard() {
   const { t, i18n } = useTranslation();
   const { user } = useAuth();
   const [selectedClassId, setSelectedClassId] = useState<string>("");
 
   // Fetch teacher's classes
   const { data: classes, isLoading: classesLoading } = useQuery({
     queryKey: ["teacher-classes", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("classes")
         .select("id, name, level:levels(name)")
         .eq("teacher_id", user!.id);
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   // Auto-select first class
   if (classes?.length && !selectedClassId) {
     setSelectedClassId(classes[0].id);
   }
 
   // Fetch enrolled students for selected class
   const { data: students, isLoading: studentsLoading } = useQuery({
     queryKey: ["class-student-progress", selectedClassId],
     queryFn: async () => {
       const { data: enrollments, error } = await supabase
         .from("class_enrollments")
         .select("student_id")
         .eq("class_id", selectedClassId)
         .eq("status", "enrolled");
       if (error) throw error;
 
       const studentIds = enrollments.map(e => e.student_id);
       if (studentIds.length === 0) return [];
 
       // Get profiles
       const { data: profiles } = await supabase
         .from("profiles")
         .select("user_id, full_name")
         .in("user_id", studentIds);
 
       // Get progress for each student
       const { data: progress } = await supabase
         .from("student_progress")
         .select("student_id, exercises_completed, exercises_total, average_score")
         .in("student_id", studentIds);
 
       // Get points
       const { data: points } = await supabase
         .from("user_points")
         .select("user_id, total_points")
         .in("user_id", studentIds);
 
       // Combine data
       return studentIds.map(sid => {
         const profile = profiles?.find(p => p.user_id === sid);
         const studentProgress = progress?.filter(p => p.student_id === sid) || [];
         const studentPoints = points?.find(p => p.user_id === sid);
 
         const totalCompleted = studentProgress.reduce((sum, p) => sum + p.exercises_completed, 0);
         const totalExercises = studentProgress.reduce((sum, p) => sum + p.exercises_total, 0);
         const avgScore = studentProgress.length
           ? studentProgress.reduce((sum, p) => sum + (p.average_score || 0), 0) / studentProgress.length
           : 0;
 
         return {
           id: sid,
           name: profile?.full_name || "Unknown",
           completed: totalCompleted,
           total: totalExercises,
           avgScore,
           points: studentPoints?.total_points || 0,
         };
       });
     },
     enabled: !!selectedClassId,
   });
 
   // Calculate class averages
   const classAvgScore = students?.length
     ? students.reduce((sum, s) => sum + s.avgScore, 0) / students.length
     : 0;
   const classAvgCompletion = students?.length
     ? students.reduce((sum, s) => sum + (s.total > 0 ? (s.completed / s.total) * 100 : 0), 0) / students.length
     : 0;
 
   const chartData = students?.map(s => ({
     name: s.name.split(" ")[0],
     score: Math.round(s.avgScore),
     completion: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
   })) || [];
 
   if (classesLoading) {
     return (
       <div className="flex justify-center py-12">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Class Selector */}
       <div className="flex items-center gap-4">
         <Select value={selectedClassId} onValueChange={setSelectedClassId}>
           <SelectTrigger className="w-64">
             <SelectValue placeholder={t("progress.selectClass", "Select a class")} />
           </SelectTrigger>
           <SelectContent>
             {classes?.map(cls => (
               <SelectItem key={cls.id} value={cls.id}>
                 {cls.name} ({cls.level?.name})
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Overview Cards */}
       <div className="grid gap-4 md:grid-cols-4">
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.totalStudents", "Total Students")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <Users className="h-5 w-5 text-primary" />
               <span className="text-2xl font-bold">{students?.length || 0}</span>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.classAvgScore", "Class Avg Score")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <Target className="h-5 w-5 text-green-500" />
               <span className="text-2xl font-bold">{classAvgScore.toFixed(0)}%</span>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.classCompletion", "Avg Completion")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <TrendingUp className="h-5 w-5 text-blue-500" />
               <span className="text-2xl font-bold">{classAvgCompletion.toFixed(0)}%</span>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>{t("progress.activeExercises", "Active Exercises")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2">
               <BookOpen className="h-5 w-5 text-purple-500" />
               <span className="text-2xl font-bold">-</span>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Chart */}
       {chartData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>{t("progress.studentComparison", "Student Comparison")}</CardTitle>
             <CardDescription>{t("progress.studentComparisonDesc", "Compare scores and completion rates")}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis dataKey="name" className="text-xs" />
                   <YAxis domain={[0, 100]} className="text-xs" />
                   <Tooltip />
                   <Bar dataKey="score" name={t("progress.score", "Score")} fill="hsl(var(--primary))" />
                   <Bar dataKey="completion" name={t("progress.completion", "Completion")} fill="hsl(var(--muted-foreground))" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Student Table */}
       <Card>
         <CardHeader>
           <CardTitle>{t("progress.studentDetails", "Student Details")}</CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>{t("common.name", "Name")}</TableHead>
                 <TableHead>{t("progress.exercisesCompleted", "Exercises")}</TableHead>
                 <TableHead>{t("progress.avgScore", "Avg Score")}</TableHead>
                 <TableHead>{t("progress.points", "Points")}</TableHead>
                 <TableHead>{t("progress.progress", "Progress")}</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {studentsLoading ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8">
                     <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                   </TableCell>
                 </TableRow>
               ) : students && students.length > 0 ? (
                 students.map(student => {
                   const progressPercent = student.total > 0 ? (student.completed / student.total) * 100 : 0;
                   return (
                     <TableRow key={student.id}>
                       <TableCell className="font-medium">{student.name}</TableCell>
                       <TableCell>{student.completed}/{student.total}</TableCell>
                       <TableCell>
                         <Badge variant={student.avgScore >= 70 ? "default" : "secondary"}>
                           {student.avgScore.toFixed(0)}%
                         </Badge>
                       </TableCell>
                       <TableCell>{student.points}</TableCell>
                       <TableCell className="w-32">
                         <Progress value={progressPercent} className="h-2" />
                       </TableCell>
                     </TableRow>
                   );
                 })
               ) : (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                     {t("progress.noStudents", "No students enrolled in this class")}
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 }