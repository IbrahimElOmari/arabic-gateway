import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Video, Loader2, ExternalLink, Edit, Trash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TeacherLessonsPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: "",
    scheduled_at: "",
    duration_minutes: "90",
    meet_link: "",
  });


  // Get teacher's classes (admin sees all)
  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("classes").select("id, name");
      if (isAdmin) {
        query = query.eq("is_active", true);
      } else {
        query = query.eq("teacher_id", user!.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const classIds = classes?.map(c => c.id) || [];

  // Get lessons
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["teacher-lessons", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, class:classes(name)")
        .in("class_id", classIds)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("lessons").insert({
        title: data.title,
        description: data.description,
        class_id: data.class_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: parseInt(data.duration_minutes),
        meet_link: data.meet_link || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: t("teacher.lessonCreated", "Lesson created successfully") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from("lessons").update({
        title: data.title,
        description: data.description,
        class_id: data.class_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: parseInt(data.duration_minutes),
        meet_link: data.meet_link || null,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons"] });
      setIsDialogOpen(false);
      setEditingLesson(null);
      resetForm();
      toast({ title: t("teacher.lessonUpdated", "Lesson updated successfully") });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-lessons"] });
      toast({ title: t("teacher.lessonDeleted", "Lesson deleted") });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      class_id: "",
      scheduled_at: "",
      duration_minutes: "90",
      meet_link: "",
    });
  };

  const handleEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || "",
      class_id: lesson.class_id,
      scheduled_at: lesson.scheduled_at.slice(0, 16),
      duration_minutes: lesson.duration_minutes.toString(),
      meet_link: lesson.meet_link || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLesson) {
      updateLessonMutation.mutate({ ...formData, id: editingLesson.id });
    } else {
      createLessonMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "outline",
      in_progress: "default",
      completed: "secondary",
      canceled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("teacher.lessons", "Lessons")}</h1>
          <p className="text-muted-foreground">{t("teacher.manageLessons", "Schedule and manage your lessons")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingLesson(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("teacher.newLesson", "New Lesson")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? t("teacher.editLesson", "Edit Lesson") : t("teacher.createLesson", "Create Lesson")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("teacher.lessonTitle", "Title")}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t("teacher.lessonTitlePlaceholder", "e.g., Introduction to Arabic Script")}
                />
              </div>
              <div>
                <Label>{t("teacher.description", "Description")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>{t("teacher.class", "Class")}</Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("teacher.selectClass", "Select a class")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("teacher.scheduledAt", "Date & Time")}</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("teacher.duration", "Duration (min)")}</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t("teacher.meetLink", "Google Meet Link")}</Label>
                <Input
                  value={formData.meet_link}
                  onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.class_id || !formData.scheduled_at || createLessonMutation.isPending || updateLessonMutation.isPending}
                className="w-full"
              >
                {(createLessonMutation.isPending || updateLessonMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingLesson ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lessons && lessons.length > 0 ? (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {lesson.title}
                      {getStatusBadge(lesson.status)}
                    </CardTitle>
                    <CardDescription>
                      {lesson.class?.name} · {format(new Date(lesson.scheduled_at), "PPP 'at' p")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {lesson.meet_link && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={lesson.meet_link} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => handleEdit(lesson)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => deleteLessonMutation.mutate(lesson.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {lesson.description && (
                <CardContent>
                  <p className="text-muted-foreground">{lesson.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("teacher.noLessons", "No lessons yet")}</h3>
            <p className="text-muted-foreground">{t("teacher.createFirstLesson", "Create your first lesson to get started")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
