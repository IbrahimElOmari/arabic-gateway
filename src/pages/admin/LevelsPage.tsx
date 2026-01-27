import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Level {
  id: string;
  name: string;
  name_nl: string;
  name_en: string;
  name_ar: string;
  description: string | null;
  display_order: number;
}

export default function LevelsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_nl: "",
    name_en: "",
    name_ar: "",
    description: "",
  });

  // Fetch levels
  const { data: levels, isLoading } = useQuery({
    queryKey: ["admin-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levels")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Level[];
    },
  });

  // Create level mutation
  const createLevelMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = levels?.reduce((max, l) => Math.max(max, l.display_order), 0) || 0;
      const { error } = await supabase.from("levels").insert({
        name: data.name,
        name_nl: data.name_nl,
        name_en: data.name_en,
        name_ar: data.name_ar,
        description: data.description || null,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
      toast({
        title: t("admin.levelCreated", "Level Created"),
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.createLevelError", "Failed to create level."),
      });
    },
  });

  // Update level mutation
  const updateLevelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("levels")
        .update({
          name: data.name,
          name_nl: data.name_nl,
          name_en: data.name_en,
          name_ar: data.name_ar,
          description: data.description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
      toast({
        title: t("admin.levelUpdated", "Level Updated"),
      });
      setEditingLevel(null);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.updateLevelError", "Failed to update level."),
      });
    },
  });

  // Delete level mutation
  const deleteLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-levels"] });
      toast({
        title: t("admin.levelDeleted", "Level Deleted"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.deleteLevelError", "Failed to delete level. It may have associated classes."),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_nl: "",
      name_en: "",
      name_ar: "",
      description: "",
    });
  };

  const handleEdit = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      name_nl: level.name_nl,
      name_en: level.name_en,
      name_ar: level.name_ar,
      description: level.description || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLevel) {
      updateLevelMutation.mutate({ id: editingLevel.id, data: formData });
    } else {
      createLevelMutation.mutate(formData);
    }
  };

  const isSubmitting = createLevelMutation.isPending || updateLevelMutation.isPending;

  const getLocalizedName = (level: Level) => {
    const lang = i18n.language;
    if (lang === "nl") return level.name_nl;
    if (lang === "ar") return level.name_ar;
    return level.name_en;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.levelManagement", "Level Management")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.levelManagementDescription", "Manage learning levels")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.createLevel", "Create Level")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.createNewLevel", "Create New Level")}</DialogTitle>
              <DialogDescription>
                {t("admin.createLevelDescription", "Add a new learning level.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.internalName", "Internal Name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_nl">Nederlands</Label>
                  <Input
                    id="name_nl"
                    value={formData.name_nl}
                    onChange={(e) => setFormData({ ...formData, name_nl: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">English</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">العربية</Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("admin.description", "Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("common.create", "Create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Levels Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t("admin.order", "Order")}</TableHead>
              <TableHead>{t("admin.name", "Name")}</TableHead>
              <TableHead>{t("admin.translations", "Translations")}</TableHead>
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
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell className="font-medium">{getLocalizedName(level)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    NL: {level.name_nl} | EN: {level.name_en} | AR: {level.name_ar}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {level.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLevelMutation.mutate(level.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("admin.noLevelsFound", "No levels found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editLevel", "Edit Level")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("admin.internalName", "Internal Name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name_nl">Nederlands</Label>
                <Input
                  id="edit-name_nl"
                  value={formData.name_nl}
                  onChange={(e) => setFormData({ ...formData, name_nl: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name_en">English</Label>
                <Input
                  id="edit-name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name_ar">العربية</Label>
                <Input
                  id="edit-name_ar"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t("admin.description", "Description")}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingLevel(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("common.save", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
