 import { useTranslation } from "react-i18next";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Label } from "@/components/ui/label";
 import { Alert, AlertDescription } from "@/components/ui/alert";
 import { AlertCircle, Loader2 } from "lucide-react";
 
 interface ClassSelectorProps {
   value: string;
   onChange: (classId: string) => void;
   label?: string;
   required?: boolean;
   disabled?: boolean;
 }
 
 export function ClassSelector({
   value,
   onChange,
   label,
   required = false,
   disabled = false,
 }: ClassSelectorProps) {
   const { t } = useTranslation();
   const { user, isAdmin } = useAuth();
 
   const { data: classes, isLoading } = useQuery({
     queryKey: ["teacher-available-classes", user?.id, isAdmin],
     queryFn: async () => {
       if (isAdmin) {
         const { data, error } = await supabase
           .from("classes")
           .select("id, name, level:levels(name)")
           .eq("is_active", true)
           .order("name");
         if (error) throw error;
         return data;
       } else {
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
 
   // Auto-select if only one class and no value set
   if (classes?.length === 1 && !value) {
     onChange(classes[0].id);
   }
 
   if (isLoading) {
     return (
       <div className="flex items-center gap-2 text-muted-foreground">
         <Loader2 className="h-4 w-4 animate-spin" />
         <span>{t("common.loading", "Loading...")}</span>
       </div>
     );
   }
 
   if (!classes || classes.length === 0) {
     return (
       <Alert variant="destructive">
         <AlertCircle className="h-4 w-4" />
         <AlertDescription>
           {isAdmin
             ? t("classSelector.noClassesAdmin", "No active classes. Create one in Admin → Classes first.")
             : t("classSelector.noClassesTeacher", "You are not assigned to any classes.")}
         </AlertDescription>
       </Alert>
     );
   }
 
   // If only one class, show it as text instead of dropdown
   if (classes.length === 1) {
     return (
       <div className="space-y-2">
         {label && <Label>{label}</Label>}
         <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
           <span className="font-medium">{classes[0].name}</span>
           <span className="text-sm text-muted-foreground">({classes[0].level?.name})</span>
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-2">
       {label && (
         <Label>
           {label} {required && <span className="text-destructive">*</span>}
         </Label>
       )}
       <Select value={value} onValueChange={onChange} disabled={disabled}>
         <SelectTrigger>
           <SelectValue placeholder={t("classSelector.selectClass", "Select a class...")} />
         </SelectTrigger>
         <SelectContent>
           {classes.map((cls) => (
             <SelectItem key={cls.id} value={cls.id}>
               {cls.name} ({cls.level?.name})
             </SelectItem>
           ))}
         </SelectContent>
       </Select>
     </div>
   );
 }