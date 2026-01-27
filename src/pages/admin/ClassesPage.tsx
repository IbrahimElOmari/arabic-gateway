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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Search, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  level_id: string;
  teacher_id: string | null;
  max_students: number;
  price: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  level?: { name: string };
  enrollment_count?: number;
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level_id: "",
    max_students: 50,
    price: "",
    currency: "EUR",
    start_date: "",
    end_date: "",
  });

  // Fetch classes
  const { data: classes, isLoading } = useQuery({
    queryKey: ["admin-classes", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("classes")
        .select("*, level:levels(name)")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get enrollment counts
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from("class_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id)
            .eq("status", "enrolled");

          return { ...cls, enrollment_count: count || 0 };
        })
      );

      return classesWithCounts as ClassData[];
    },
  });

  // Fetch levels for dropdown
  const { data: levels } = useQuery({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levels")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("classes").insert({
        name: data.name,
        description: data.description || null,
        level_id: data.level_id,
        max_students: data.max_students,
        price: data.price ? parseFloat(data.price) : null,
        currency: data.currency,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      toast({
        title: t("admin.classCreated", "Class Created"),
        description: t("admin.classCreatedDescription", "The class has been created successfully."),
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.createClassError", "Failed to create class."),
      });
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("classes")
        .update({
          name: data.name,
          description: data.description || null,
          level_id: data.level_id,
          max_students: data.max_students,
          price: data.price ? parseFloat(data.price) : null,
          currency: data.currency,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      toast({
        title: t("admin.classUpdated", "Class Updated"),
        description: t("admin.classUpdatedDescription", "The class has been updated successfully."),
      });
      setEditingClass(null);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.updateClassError", "Failed to update class."),
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      toast({
        title: t("admin.classDeleted", "Class Deleted"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.deleteClassError", "Failed to delete class."),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      level_id: "",
      max_students: 50,
      price: "",
      currency: "EUR",
      start_date: "",
      end_date: "",
    });
  };

  const handleEdit = (cls: ClassData) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || "",
      level_id: cls.level_id,
      max_students: cls.max_students,
      price: cls.price?.toString() || "",
      currency: cls.currency,
      start_date: cls.start_date || "",
      end_date: cls.end_date || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, data: formData });
    } else {
      createClassMutation.mutate(formData);
    }
  };

  const isSubmitting = createClassMutation.isPending || updateClassMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.classManagement", "Class Management")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.classManagementDescription", "Create and manage classes")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.createClass", "Create Class")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.createNewClass", "Create New Class")}</DialogTitle>
              <DialogDescription>
                {t("admin.createClassDescription", "Fill in the details to create a new class.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.className", "Class Name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("admin.description", "Description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">{t("admin.level", "Level")}</Label>
                <Select
                  value={formData.level_id}
                  onValueChange={(v) => setFormData({ ...formData, level_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.selectLevel", "Select level")} />
                  </SelectTrigger>
                  <SelectContent>
                    {levels?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_students">{t("admin.maxStudents", "Max Students")}</Label>
                  <Input
                    id="max_students"
                    type="number"
                    min={1}
                    max={50}
                    value={formData.max_students}
                    onChange={(e) =>
                      setFormData({ ...formData, max_students: parseInt(e.target.value) || 50 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">{t("admin.price", "Price")} (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("admin.startDate", "Start Date")}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">{t("admin.endDate", "End Date")}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("admin.searchClasses", "Search classes...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Classes Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.className", "Class Name")}</TableHead>
              <TableHead>{t("admin.level", "Level")}</TableHead>
              <TableHead>{t("admin.students", "Students")}</TableHead>
              <TableHead>{t("admin.price", "Price")}</TableHead>
              <TableHead>{t("admin.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : classes && classes.length > 0 ? (
              classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.level?.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          (cls.enrollment_count || 0) >= cls.max_students
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {cls.enrollment_count || 0}/{cls.max_students}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cls.price ? `€${cls.price.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cls.is_active ? "default" : "secondary"}>
                      {cls.is_active ? t("admin.active", "Active") : t("admin.inactive", "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cls)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteClassMutation.mutate(cls.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("admin.noClassesFound", "No classes found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.editClass", "Edit Class")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("admin.className", "Class Name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t("admin.description", "Description")}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-level">{t("admin.level", "Level")}</Label>
              <Select
                value={formData.level_id}
                onValueChange={(v) => setFormData({ ...formData, level_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectLevel", "Select level")} />
                </SelectTrigger>
                <SelectContent>
                  {levels?.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max">{t("admin.maxStudents", "Max Students")}</Label>
                <Input
                  id="edit-max"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.max_students}
                  onChange={(e) =>
                    setFormData({ ...formData, max_students: parseInt(e.target.value) || 50 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">{t("admin.price", "Price")} (€)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>
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
