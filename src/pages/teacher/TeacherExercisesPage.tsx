import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, BookOpen, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExerciseBuilder } from "@/components/teacher/ExerciseBuilder";

export default function TeacherExercisesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Get teacher's classes
  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get categories
  const { data: categories } = useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Get exercises for teacher's classes
  const classIds = classes?.map((c) => c.id) || [];
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["teacher-exercises", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*, class:classes(name), category:exercise_categories(name_nl, name_en, name_ar)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  const [exerciseForm, setExerciseForm] = useState({
    class_id: "",
    category_id: "",
    title: "",
    description: "",
    passing_score: 60,
    max_attempts: 3,
    time_limit_seconds: null as number | null,
    is_published: false,
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (form: typeof exerciseForm) => {
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          ...form,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises"] });
      setShowExerciseDialog(false);
      setSelectedExerciseId(data.id);
      resetForm();
      toast({
        title: t("teacher.exerciseCreated", "Exercise Created"),
        description: t("teacher.addQuestionsNow", "Now add questions to your exercise."),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("teacher.exerciseCreateError", "Failed to create exercise."),
      });
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises"] });
      toast({
        title: t("teacher.exerciseDeleted", "Exercise Deleted"),
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase.from("exercises").update({ is_published: isPublished }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exercises"] });
    },
  });

  const resetForm = () => {
    setExerciseForm({
      class_id: "",
      category_id: "",
      title: "",
      description: "",
      passing_score: 60,
      max_attempts: 3,
      time_limit_seconds: null,
      is_published: false,
    });
  };

  const getCategoryName = (category: any) => {
    const lang = i18n.language;
    if (lang === "nl") return category?.name_nl;
    if (lang === "ar") return category?.name_ar;
    return category?.name_en;
  };

  // If an exercise is selected, show the question builder
  if (selectedExerciseId) {
    return (
      <ExerciseBuilder
        exerciseId={selectedExerciseId}
        onBack={() => setSelectedExerciseId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("teacher.exercises", "Exercises")}</h1>
          <p className="text-muted-foreground">
            {t("teacher.exercisesDescription", "Create and manage exercises for your classes")}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingExercise(null); setShowExerciseDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t("teacher.createExercise", "Create Exercise")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.title", "Title")}</TableHead>
                <TableHead>{t("admin.class", "Class")}</TableHead>
                <TableHead>{t("admin.category", "Category")}</TableHead>
                <TableHead>{t("admin.status", "Status")}</TableHead>
                <TableHead>{t("admin.created", "Created")}</TableHead>
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
              ) : exercises && exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.title}</TableCell>
                    <TableCell>{exercise.class?.name}</TableCell>
                    <TableCell>{getCategoryName(exercise.category)}</TableCell>
                    <TableCell>
                      <Badge variant={exercise.is_published ? "default" : "secondary"}>
                        {exercise.is_published ? t("common.published", "Published") : t("common.draft", "Draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(exercise.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublishMutation.mutate({ id: exercise.id, isPublished: !exercise.is_published })}
                      >
                        {exercise.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExerciseId(exercise.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t("teacher.editQuestions", "Questions")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExerciseMutation.mutate(exercise.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("teacher.noExercises", "No exercises yet. Create your first exercise!")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Exercise Dialog */}
      <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacher.createExercise", "Create Exercise")}</DialogTitle>
            <DialogDescription>
              {t("teacher.createExerciseDescription", "Set up a new exercise for your students.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("admin.class", "Class")}</Label>
              <Select value={exerciseForm.class_id} onValueChange={(v) => setExerciseForm({ ...exerciseForm, class_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectClass", "Select class")} />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.category", "Category")}</Label>
              <Select value={exerciseForm.category_id} onValueChange={(v) => setExerciseForm({ ...exerciseForm, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectCategory", "Select category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("common.title", "Title")}</Label>
              <Input
                value={exerciseForm.title}
                onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label>{t("common.description", "Description")}</Label>
              <Textarea
                value={exerciseForm.description}
                onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("teacher.passingScore", "Passing Score (%)")}</Label>
                <Input
                  type="number"
                  value={exerciseForm.passing_score}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, passing_score: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t("teacher.maxAttempts", "Max Attempts")}</Label>
                <Input
                  type="number"
                  value={exerciseForm.max_attempts}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, max_attempts: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>{t("teacher.timeLimit", "Time Limit (minutes, optional)")}</Label>
              <Input
                type="number"
                value={exerciseForm.time_limit_seconds ? exerciseForm.time_limit_seconds / 60 : ""}
                onChange={(e) => setExerciseForm({ ...exerciseForm, time_limit_seconds: e.target.value ? parseInt(e.target.value) * 60 : null })}
                placeholder={t("teacher.noTimeLimit", "No time limit")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExerciseDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => createExerciseMutation.mutate(exerciseForm)}
              disabled={!exerciseForm.class_id || !exerciseForm.category_id || !exerciseForm.title || createExerciseMutation.isPending}
            >
              {createExerciseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
