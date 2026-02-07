import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, BookMarked, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ThemesManagerProps {
  onSelectTheme?: (themeId: string) => void;
  selectedThemeId?: string;
}

export function ThemesManager({ onSelectTheme, selectedThemeId }: ThemesManagerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const [formData, setFormData] = useState({
    name_nl: "",
    name_en: "",
    name_ar: "",
    description: "",
  });

  // Fetch themes
  const { data: themes, isLoading } = useQuery({
    queryKey: ["lesson-themes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_themes")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const displayOrder = (themes?.length || 0) + 1;
      const { error } = await supabase.from("lesson_themes").insert({
        ...data,
        display_order: displayOrder,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-themes"] });
      setShowDialog(false);
      resetForm();
      toast({ title: t("teacher.themeCreated", "Theme Created") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("lesson_themes").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-themes"] });
      setShowDialog(false);
      setEditingTheme(null);
      resetForm();
      toast({ title: t("teacher.themeUpdated", "Theme Updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_themes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-themes"] });
      toast({ title: t("teacher.themeDeleted", "Theme Deleted") });
    },
  });

  const resetForm = () => {
    setFormData({
      name_nl: "",
      name_en: "",
      name_ar: "",
      description: "",
    });
  };

  const openEditDialog = (theme: any) => {
    setEditingTheme(theme);
    setFormData({
      name_nl: theme.name_nl,
      name_en: theme.name_en,
      name_ar: theme.name_ar,
      description: theme.description || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingTheme) {
      updateMutation.mutate({ id: editingTheme.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getThemeName = (theme: any) => {
    const lang = i18n.language;
    if (lang === "nl") return theme.name_nl;
    if (lang === "ar") return theme.name_ar;
    return theme.name_en;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookMarked className="h-5 w-5" />
          {t("teacher.lessonThemes", "Lesson Themes")}
        </h3>
        <Button size="sm" onClick={() => { resetForm(); setEditingTheme(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          {t("teacher.addTheme", "Add Theme")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : themes && themes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.order", "Order")}</TableHead>
              <TableHead>{t("common.name", "Name")}</TableHead>
              <TableHead>{t("common.description", "Description")}</TableHead>
              <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {themes.map((theme, index) => (
              <TableRow 
                key={theme.id} 
                className={selectedThemeId === theme.id ? "bg-primary/10" : ""}
                onClick={() => onSelectTheme?.(theme.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{getThemeName(theme)}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-xs">
                  {theme.description || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(theme); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(theme.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">{t("teacher.noThemes", "No themes yet")}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("teacher.createFirstTheme", "Create First Theme")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Theme Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? t("teacher.editTheme", "Edit Theme") : t("teacher.createTheme", "Create Theme")}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="en" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="nl">Nederlands</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>
            {["en", "nl", "ar"].map((lang) => (
              <TabsContent key={lang} value={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
                <div className="space-y-4">
                  <div>
                    <Label>{t("common.name", "Name")} ({lang.toUpperCase()})</Label>
                    <Input
                      value={formData[`name_${lang}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`name_${lang}`]: e.target.value })}
                      placeholder={t("teacher.themeNamePlaceholder", "e.g., Daily Life")}
                    />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div>
            <Label>{t("common.description", "Description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder={t("teacher.themeDescriptionPlaceholder", "Optional description...")}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name_en || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTheme ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
