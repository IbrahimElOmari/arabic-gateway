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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Search, Users, UserPlus, GraduationCap, X } from "lucide-react";
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
  teacher?: { full_name: string } | null;
  enrollment_count?: number;
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [assignDialogClass, setAssignDialogClass] = useState<ClassData | null>(null);
  const [assignTab, setAssignTab] = useState<"teacher" | "students">("teacher");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level_id: "",
    teacher_id: "",
    max_students: 50,
    price: "",
    currency: "EUR",
    start_date: "",
    end_date: "",
  });

  // Fetch classes with teacher info
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

      // Get enrollment counts and teacher names
      const classesWithDetails = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from("class_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id)
            .eq("status", "enrolled");

          let teacher = null;
          if (cls.teacher_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", cls.teacher_id)
              .single();
            teacher = profile;
          }

          return { ...cls, enrollment_count: count || 0, teacher };
        })
      );

      return classesWithDetails as ClassData[];
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

  // Fetch approved teachers
  const { data: teachers } = useQuery({
    queryKey: ["approved-teachers"],
    queryFn: async () => {
      const { data: teacherRoles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (error) throw error;

      if (!teacherRoles || teacherRoles.length === 0) return [];

      const userIds = teacherRoles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      return profiles || [];
    },
  });

  // Fetch students for assignment
  const { data: allStudents } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data: studentRoles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (error) throw error;

      if (!studentRoles || studentRoles.length === 0) return [];

      const userIds = studentRoles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      return profiles || [];
    },
  });

  // Fetch enrolled students for a class
  const { data: enrolledStudents } = useQuery({
    queryKey: ["class-enrollments", assignDialogClass?.id],
    queryFn: async () => {
      if (!assignDialogClass) return [];
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("student_id")
        .eq("class_id", assignDialogClass.id)
        .eq("status", "enrolled");
      if (error) throw error;
      return data?.map((e) => e.student_id) || [];
    },
    enabled: !!assignDialogClass,
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("classes").insert({
        name: data.name,
        description: data.description || null,
        level_id: data.level_id,
        teacher_id: data.teacher_id || null,
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
          teacher_id: data.teacher_id || null,
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

  // Assign teacher mutation
  const assignTeacherMutation = useMutation({
    mutationFn: async ({ classId, teacherId }: { classId: string; teacherId: string | null }) => {
      const { error } = await supabase
        .from("classes")
        .update({ teacher_id: teacherId })
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      toast({ title: t("admin.teacherAssigned", "Teacher assigned successfully") });
    },
  });

  // Enroll student mutation
  const enrollStudentMutation = useMutation({
    mutationFn: async ({ classId, studentId, enroll }: { classId: string; studentId: string; enroll: boolean }) => {
      if (enroll) {
        const { error } = await supabase.from("class_enrollments").insert({
          class_id: classId,
          student_id: studentId,
          status: "enrolled",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("class_enrollments")
          .delete()
          .eq("class_id", classId)
          .eq("student_id", studentId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-enrollments", assignDialogClass?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      level_id: "",
      teacher_id: "",
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
      teacher_id: cls.teacher_id || "",
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

  const ClassFormFields = () => (
    <>
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
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="teacher">{t("admin.teacher", "Teacher")}</Label>
          <Select
            value={formData.teacher_id}
            onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("admin.selectTeacher", "Select teacher")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("admin.noTeacher", "No teacher")}</SelectItem>
              {teachers?.map((teacher) => (
                <SelectItem key={teacher.user_id} value={teacher.user_id}>
                  {teacher.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.classManagement", "Class Management")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.classManagementDescription", "Create and manage classes, assign teachers and students")}
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
              <ClassFormFields />
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
              <TableHead>{t("admin.teacher", "Teacher")}</TableHead>
              <TableHead>{t("admin.students", "Students")}</TableHead>
              <TableHead>{t("admin.price", "Price")}</TableHead>
              <TableHead>{t("admin.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : classes && classes.length > 0 ? (
              classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.level?.name}</TableCell>
                  <TableCell>
                    {cls.teacher?.full_name || (
                      <span className="text-muted-foreground italic">
                        {t("admin.noTeacher", "No teacher")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          (cls.enrollment_count || 0) >= cls.max_students
                            ? "text-destructive font-medium"
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
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAssignDialogClass(cls);
                          setAssignTab("teacher");
                        }}
                        title={t("admin.assignMembers", "Assign members")}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
            <ClassFormFields />
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

      {/* Assign Members Dialog */}
      <Dialog open={!!assignDialogClass} onOpenChange={() => setAssignDialogClass(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t("admin.manageClassMembers", "Manage Class Members")} - {assignDialogClass?.name}
            </DialogTitle>
            <DialogDescription>
              {t("admin.assignMembersDescription", "Assign a teacher and enroll students in this class.")}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={assignTab} onValueChange={(v) => setAssignTab(v as "teacher" | "students")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teacher">{t("admin.teacher", "Teacher")}</TabsTrigger>
              <TabsTrigger value="students">{t("admin.students", "Students")}</TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.assignTeacher", "Assign Teacher")}</Label>
                <Select
                  value={assignDialogClass?.teacher_id || ""}
                  onValueChange={(v) => {
                    if (assignDialogClass) {
                      assignTeacherMutation.mutate({
                        classId: assignDialogClass.id,
                        teacherId: v || null,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.selectTeacher", "Select teacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("admin.noTeacher", "No teacher")}</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.user_id} value={teacher.user_id}>
                        {teacher.full_name} ({teacher.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {teachers?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("admin.noTeachersAvailable", "No approved teachers available. Approve teachers first.")}
                </p>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("admin.enrollStudents", "Enroll Students")}</Label>
                <Badge variant="outline">
                  {enrolledStudents?.length || 0}/{assignDialogClass?.max_students || 50} {t("admin.enrolled", "enrolled")}
                </Badge>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {allStudents?.map((student) => {
                    const isEnrolled = enrolledStudents?.includes(student.user_id);
                    const isAtCapacity = (enrolledStudents?.length || 0) >= (assignDialogClass?.max_students || 50);

                    return (
                      <div
                        key={student.user_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={student.user_id}
                            checked={isEnrolled}
                            disabled={!isEnrolled && isAtCapacity}
                            onCheckedChange={(checked) => {
                              if (assignDialogClass) {
                                enrollStudentMutation.mutate({
                                  classId: assignDialogClass.id,
                                  studentId: student.user_id,
                                  enroll: !!checked,
                                });
                              }
                            }}
                          />
                          <label htmlFor={student.user_id} className="cursor-pointer">
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </label>
                        </div>
                        {isEnrolled && (
                          <Badge variant="default">{t("admin.enrolled", "Enrolled")}</Badge>
                        )}
                      </div>
                    );
                  })}

                  {allStudents?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("admin.noStudentsAvailable", "No students available to enroll.")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogClass(null)}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
