 import { useState } from "react";
 import { useTranslation } from "react-i18next";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Plus, Pencil, Trash2, Loader2, Layers } from "lucide-react";
 import { toast } from "@/hooks/use-toast";
 
 export default function LevelsManagementPage() {
   const { t, i18n } = useTranslation();
   const queryClient = useQueryClient();
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [editingLevel, setEditingLevel] = useState<any>(null);
   const [formData, setFormData] = useState({
     name: "",
     name_nl: "",
     name_en: "",
     name_ar: "",
     description: "",
     display_order: 0,
   });
 
   const { data: levels, isLoading } = useQuery({
     queryKey: ["admin-levels"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("levels")
         .select("*")
         .order("display_order");
       if (error) throw error;
       return data;
     },
   });
 
   const { data: classCounts } = useQuery({
     queryKey: ["level-class-counts"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("classes")
         .select("level_id");
       if (error) throw error;
       
       const counts: Record<string, number> = {};
       data.forEach((cls) => {
         counts[cls.level_id] = (counts[cls.level_id] || 0) + 1;
       });
       return counts;
     },
   });
 
   const createMutation = useMutation({
     mutationFn: async (data: typeof formData) => {
       const { error } = await supabase.from("levels").insert({
         name: data.name,
         name_nl: data.name_nl,
         name_en: data.name_en,
         name_ar: data.name_ar,
         description: data.description || null,
         display_order: data.display_order,
       });
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
       setIsDialogOpen(false);
       resetForm();
       toast({ title: t("admin.levelCreated", "Level created successfully") });
     },
   });
 
   const updateMutation = useMutation({
     mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
       const { error } = await supabase
         .from("levels")
         .update({
           name: data.name,
           name_nl: data.name_nl,
           name_en: data.name_en,
           name_ar: data.name_ar,
           description: data.description || null,
           display_order: data.display_order,
         })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
       setIsDialogOpen(false);
       setEditingLevel(null);
       resetForm();
       toast({ title: t("admin.levelUpdated", "Level updated successfully") });
     },
   });
 
   const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("levels").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
       toast({ title: t("admin.levelDeleted", "Level deleted") });
     },
   });
 
   const resetForm = () => {
     setFormData({
       name: "",
       name_nl: "",
       name_en: "",
       name_ar: "",
       description: "",
       display_order: levels?.length || 0,
     });
   };
 
   const handleEdit = (level: any) => {
     setEditingLevel(level);
     setFormData({
       name: level.name,
       name_nl: level.name_nl,
       name_en: level.name_en,
       name_ar: level.name_ar,
       description: level.description || "",
       display_order: level.display_order,
     });
     setIsDialogOpen(true);
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (editingLevel) {
       updateMutation.mutate({ id: editingLevel.id, data: formData });
     } else {
       createMutation.mutate(formData);
     }
   };
 
   const getLevelName = (level: any) => {
     const lang = i18n.language;
     if (lang === "nl") return level.name_nl;
     if (lang === "ar") return level.name_ar;
     return level.name_en;
   };
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold">{t("admin.levelManagement", "Level Management")}</h1>
           <p className="text-muted-foreground">
             {t("admin.levelManagementDesc", "Create and manage learning levels (Beginner, Intermediate, Advanced)")}
           </p>
         </div>
         <Button onClick={() => { resetForm(); setEditingLevel(null); setIsDialogOpen(true); }}>
           <Plus className="h-4 w-4 mr-2" />
           {t("admin.createLevel", "Create Level")}
         </Button>
       </div>
 
       <Card>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead className="w-16">{t("admin.order", "Order")}</TableHead>
                 <TableHead>{t("admin.levelName", "Level Name")}</TableHead>
                 <TableHead>{t("admin.classes", "Classes")}</TableHead>
                 <TableHead>{t("admin.description", "Description")}</TableHead>
                 <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {isLoading ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8">
                     <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                   </TableCell>
                 </TableRow>
               ) : levels && levels.length > 0 ? (
                 levels.map((level) => (
                   <TableRow key={level.id}>
                     <TableCell>
                       <Badge variant="outline">{level.display_order + 1}</Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Layers className="h-4 w-4 text-primary" />
                         <span className="font-medium">{getLevelName(level)}</span>
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge variant="secondary">{classCounts?.[level.id] || 0}</Badge>
                     </TableCell>
                     <TableCell className="max-w-xs truncate">
                       {level.description || "-"}
                     </TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => deleteMutation.mutate(level.id)}
                         disabled={(classCounts?.[level.id] || 0) > 0}
                       >
                         <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))
               ) : (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                     {t("admin.noLevels", "No levels created yet")}
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingLevel(null); }}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               {editingLevel ? t("admin.editLevel", "Edit Level") : t("admin.createLevel", "Create Level")}
             </DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label>{t("admin.internalName", "Internal Name")}</Label>
               <Input
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 placeholder="e.g., beginner"
                 required
               />
             </div>
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label>Nederlands</Label>
                 <Input
                   value={formData.name_nl}
                   onChange={(e) => setFormData({ ...formData, name_nl: e.target.value })}
                   placeholder="Beginner"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label>English</Label>
                 <Input
                   value={formData.name_en}
                   onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                   placeholder="Beginner"
                   required
                 />
               </div>
               <div className="space-y-2" dir="rtl">
                 <Label>العربية</Label>
                 <Input
                   value={formData.name_ar}
                   onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                   placeholder="مبتدئ"
                   required
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label>{t("admin.description", "Description")}</Label>
               <Textarea
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label>{t("admin.displayOrder", "Display Order")}</Label>
               <Input
                 type="number"
                 min={0}
                 value={formData.display_order}
                 onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
               />
             </div>
             <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                 {t("common.cancel", "Cancel")}
               </Button>
               <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                 {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                 {editingLevel ? t("common.save", "Save") : t("common.create", "Create")}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>
     </div>
   );
 }