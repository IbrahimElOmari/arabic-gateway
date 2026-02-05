 import { useState } from "react";
 import { useTranslation } from "react-i18next";
 import { useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { Calendar, Clock, Loader2 } from "lucide-react";
 import { toast } from "@/hooks/use-toast";
 import { format } from "date-fns";
 
 interface ExerciseReleaseSettingsProps {
   exercise: {
     id: string;
     title: string;
     is_published: boolean;
     release_date: string;
     due_date: string | null;
   };
 }
 
 export function ExerciseReleaseSettings({ exercise }: ExerciseReleaseSettingsProps) {
   const { t } = useTranslation();
   const queryClient = useQueryClient();
   const [isPublished, setIsPublished] = useState(exercise.is_published);
   const [releaseDate, setReleaseDate] = useState(
     exercise.release_date ? format(new Date(exercise.release_date), "yyyy-MM-dd'T'HH:mm") : ""
   );
   const [dueDate, setDueDate] = useState(
     exercise.due_date ? format(new Date(exercise.due_date), "yyyy-MM-dd'T'HH:mm") : ""
   );
 
   const updateMutation = useMutation({
     mutationFn: async () => {
       const { error } = await supabase
         .from("exercises")
         .update({
           is_published: isPublished,
           release_date: releaseDate ? new Date(releaseDate).toISOString() : new Date().toISOString(),
           due_date: dueDate ? new Date(dueDate).toISOString() : null,
         })
         .eq("id", exercise.id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["teacher-exercises"] });
       toast({
         title: t("exercises.releaseUpdated", "Release settings updated"),
       });
     },
     onError: () => {
       toast({
         variant: "destructive",
         title: t("common.error", "Error"),
         description: t("exercises.releaseUpdateError", "Failed to update release settings"),
       });
     },
   });
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Calendar className="h-5 w-5" />
           {t("exercises.releaseSettings", "Release Settings")}
         </CardTitle>
         <CardDescription>
           {t("exercises.releaseSettingsDesc", "Control when this exercise becomes available to students")}
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="flex items-center justify-between">
           <div className="space-y-0.5">
             <Label>{t("exercises.published", "Published")}</Label>
             <p className="text-sm text-muted-foreground">
               {t("exercises.publishedDesc", "Make this exercise visible to students")}
             </p>
           </div>
           <Switch checked={isPublished} onCheckedChange={setIsPublished} />
         </div>
 
         <div className="grid gap-4 md:grid-cols-2">
           <div className="space-y-2">
             <Label htmlFor="release-date" className="flex items-center gap-2">
               <Clock className="h-4 w-4" />
               {t("exercises.releaseDate", "Release Date")}
             </Label>
             <Input
               id="release-date"
               type="datetime-local"
               value={releaseDate}
               onChange={(e) => setReleaseDate(e.target.value)}
             />
             <p className="text-xs text-muted-foreground">
               {t("exercises.releaseDateDesc", "Exercise becomes available at this date/time")}
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="due-date" className="flex items-center gap-2">
               <Clock className="h-4 w-4" />
               {t("exercises.dueDate", "Due Date (Optional)")}
             </Label>
             <Input
               id="due-date"
               type="datetime-local"
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
             />
             <p className="text-xs text-muted-foreground">
               {t("exercises.dueDateDesc", "Deadline for submissions")}
             </p>
           </div>
         </div>
 
         <Button
           onClick={() => updateMutation.mutate()}
           disabled={updateMutation.isPending}
           className="w-full"
         >
           {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
           {t("common.saveChanges", "Save Changes")}
         </Button>
       </CardContent>
     </Card>
   );
 }