 import { useState } from "react";
 import { useTranslation } from "react-i18next";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { Alert, AlertDescription } from "@/components/ui/alert";
 import {
   BookOpen,
   Video,
   FileText,
   Calendar,
   GraduationCap,
   Settings,
   AlertCircle,
   Loader2,
 } from "lucide-react";
 import { Link } from "react-router-dom";
 
 export default function ContentStudioPage() {
   const { t, i18n } = useTranslation();
   const { user, isAdmin } = useAuth();
   const [selectedClassId, setSelectedClassId] = useState<string>("");
 
   // Fetch available classes based on role
   const { data: classes, isLoading: classesLoading } = useQuery({
     queryKey: ["content-studio-classes", user?.id, isAdmin],
     queryFn: async () => {
       if (isAdmin) {
         // Admin can access all classes
         const { data, error } = await supabase
           .from("classes")
           .select("id, name, level:levels(name)")
           .eq("is_active", true)
           .order("name");
         if (error) throw error;
         return data;
       } else {
         // Teacher can only access assigned classes
         const { data, error } = await supabase
           .from("classes")
           .select("id, name, level:levels(name)")
           .eq("teacher_id", user!.id)
           .eq("is_active", true)
           .order("name");
         if (error) throw error;
         return data;
       }
     },
     enabled: !!user,
   });
 
   // Get exercise count for selected class
   const { data: exerciseCount } = useQuery({
     queryKey: ["exercise-count", selectedClassId],
     queryFn: async () => {
       const { count, error } = await supabase
         .from("exercises")
         .select("*", { count: "exact", head: true })
         .eq("class_id", selectedClassId);
       if (error) throw error;
       return count || 0;
     },
     enabled: !!selectedClassId,
   });
 
   // Get lesson count for selected class
   const { data: lessonCount } = useQuery({
     queryKey: ["lesson-count", selectedClassId],
     queryFn: async () => {
       const { count, error } = await supabase
         .from("lessons")
         .select("*", { count: "exact", head: true })
         .eq("class_id", selectedClassId);
       if (error) throw error;
       return count || 0;
     },
     enabled: !!selectedClassId,
   });
 
   // Get recording count
   const { data: recordingCount } = useQuery({
     queryKey: ["recording-count", selectedClassId],
     queryFn: async () => {
       const { data: lessons } = await supabase
         .from("lessons")
         .select("id")
         .eq("class_id", selectedClassId);
       if (!lessons || lessons.length === 0) return 0;
       
       const lessonIds = lessons.map(l => l.id);
       const { count, error } = await supabase
         .from("lesson_recordings")
         .select("*", { count: "exact", head: true })
         .in("lesson_id", lessonIds);
       if (error) throw error;
       return count || 0;
     },
     enabled: !!selectedClassId,
   });
 
   const needsClassSelection = !selectedClassId && (classes?.length || 0) > 1;
   const hasNoClasses = !classesLoading && (!classes || classes.length === 0);
 
   // Auto-select if only one class
   if (classes?.length === 1 && !selectedClassId) {
     setSelectedClassId(classes[0].id);
   }
 
   const selectedClass = classes?.find(c => c.id === selectedClassId);
 
   const contentModules = [
     {
       id: "exercises",
       title: t("contentStudio.selfStudy", "Self-Study Exercises"),
       description: t("contentStudio.selfStudyDesc", "Create reading, writing, listening, speaking, and grammar exercises"),
       icon: BookOpen,
       count: exerciseCount,
       link: "/teacher/exercises",
       color: "text-blue-500",
     },
     {
       id: "lessons",
       title: t("contentStudio.liveLessons", "Live Lessons"),
       description: t("contentStudio.liveLessonsDesc", "Schedule Google Meet sessions with your students"),
       icon: Calendar,
       count: lessonCount,
       link: "/teacher/lessons",
       color: "text-green-500",
     },
     {
       id: "recordings",
       title: t("contentStudio.recordings", "Lesson Recordings"),
       description: t("contentStudio.recordingsDesc", "Upload and manage video recordings of past lessons"),
       icon: Video,
       count: recordingCount,
       link: "/teacher/recordings",
       color: "text-purple-500",
     },
     {
       id: "materials",
       title: t("contentStudio.materials", "Course Materials"),
       description: t("contentStudio.materialsDesc", "Upload PDFs, slides, and supplementary documents"),
       icon: FileText,
       count: null,
       link: "/teacher/materials",
       color: "text-orange-500",
     },
     {
       id: "submissions",
       title: t("contentStudio.submissions", "Student Submissions"),
       description: t("contentStudio.submissionsDesc", "Review and grade student work"),
       icon: GraduationCap,
       count: null,
       link: "/teacher/submissions",
       color: "text-red-500",
     },
   ];
 
   if (classesLoading) {
     return (
       <div className="flex justify-center py-12">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold">{t("contentStudio.title", "Content Studio")}</h1>
           <p className="text-muted-foreground">
             {t("contentStudio.description", "Create and manage all your educational content in one place")}
           </p>
         </div>
       </div>
 
       {/* No Classes Warning */}
       {hasNoClasses && (
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>
             {isAdmin
               ? t("contentStudio.noClassesAdmin", "No classes exist yet. Create a class first in Admin → Classes.")
               : t("contentStudio.noClassesTeacher", "You are not assigned to any classes yet. Contact an administrator.")}
           </AlertDescription>
         </Alert>
       )}
 
       {/* Class Selection */}
       {!hasNoClasses && (
         <Card>
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <Settings className="h-5 w-5" />
               {t("contentStudio.selectClass", "Select Target Class")}
             </CardTitle>
             <CardDescription>
               {t("contentStudio.selectClassDesc", "All content you create will be assigned to this class")}
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-4">
               <div className="flex-1 max-w-md">
                 <Label htmlFor="class-select" className="sr-only">
                   {t("contentStudio.class", "Class")}
                 </Label>
                 <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                   <SelectTrigger id="class-select">
                     <SelectValue placeholder={t("contentStudio.chooseClass", "Choose a class...")} />
                   </SelectTrigger>
                   <SelectContent>
                     {classes?.map((cls) => (
                       <SelectItem key={cls.id} value={cls.id}>
                         {cls.name} ({cls.level?.name})
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               {selectedClass && (
                 <Badge variant="outline" className="text-sm">
                   {selectedClass.level?.name}
                 </Badge>
               )}
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Content Modules Grid */}
       {selectedClassId ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
           {contentModules.map((module) => (
             <Link key={module.id} to={module.link}>
               <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <div className={`rounded-full bg-muted p-3 ${module.color}`}>
                       <module.icon className="h-6 w-6" />
                     </div>
                     {module.count !== null && (
                       <Badge variant="secondary">{module.count}</Badge>
                     )}
                   </div>
                   <CardTitle className="mt-4">{module.title}</CardTitle>
                   <CardDescription>{module.description}</CardDescription>
                 </CardHeader>
               </Card>
             </Link>
           ))}
         </div>
       ) : !hasNoClasses ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold">
               {t("contentStudio.selectClassFirst", "Select a Class First")}
             </h3>
             <p className="text-muted-foreground max-w-md">
               {t("contentStudio.selectClassFirstDesc", "Choose a class from the dropdown above to start creating content.")}
             </p>
           </CardContent>
         </Card>
       ) : null}
 
       {/* Quick Stats */}
       {selectedClassId && (
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">{t("contentStudio.quickStats", "Quick Statistics")}</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid gap-4 md:grid-cols-4">
               <div className="text-center p-4 bg-muted rounded-lg">
                 <p className="text-3xl font-bold text-primary">{exerciseCount || 0}</p>
                 <p className="text-sm text-muted-foreground">{t("contentStudio.exercises", "Exercises")}</p>
               </div>
               <div className="text-center p-4 bg-muted rounded-lg">
                 <p className="text-3xl font-bold text-primary">{lessonCount || 0}</p>
                 <p className="text-sm text-muted-foreground">{t("contentStudio.lessons", "Lessons")}</p>
               </div>
               <div className="text-center p-4 bg-muted rounded-lg">
                 <p className="text-3xl font-bold text-primary">{recordingCount || 0}</p>
                 <p className="text-sm text-muted-foreground">{t("contentStudio.recordingsCount", "Recordings")}</p>
               </div>
               <div className="text-center p-4 bg-muted rounded-lg">
                 <p className="text-3xl font-bold text-primary">-</p>
                 <p className="text-sm text-muted-foreground">{t("contentStudio.materialsCount", "Materials")}</p>
               </div>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }