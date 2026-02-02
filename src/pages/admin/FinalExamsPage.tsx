import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, GraduationCap, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FinalExamsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    level_id: "",
    title: "",
    description: "",
    passing_score: 70,
    time_limit_seconds: 3600,
    max_attempts: 3,
    is_active: true,
  });

  // Fetch levels
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

  // Fetch final exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["final-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_exams")
        .select("*, level:levels(id, name, name_nl, name_en, name_ar)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch attempt counts
  const { data: attemptCounts } = useQuery({
    queryKey: ["final-exam-attempt-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_exam_attempts")
        .select("final_exam_id, passed");
      if (error) throw error;
      
      const counts: Record<string, { total: number; passed: number }> = {};
      data.forEach((attempt) => {
        if (!counts[attempt.final_exam_id]) {
          counts[attempt.final_exam_id] = { total: 0, passed: 0 };
        }
        counts[attempt.final_exam_id].total++;
        if (attempt.passed) {
          counts[attempt.final_exam_id].passed++;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("final_exams").insert({
        ...data,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-exams"] });
      setShowDialog(false);
      resetForm();
      toast({ title: t("admin.examCreated", "Exam Created") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error") });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("final_exams").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-exams"] });
      setShowDialog(false);
      setEditingExam(null);
      resetForm();
      toast({ title: t("admin.examUpdated", "Exam Updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("final_exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-exams"] });
      toast({ title: t("admin.examDeleted", "Exam Deleted") });
    },
  });

  const resetForm = () => {
    setFormData({
      level_id: "",
      title: "",
      description: "",
      passing_score: 70,
      time_limit_seconds: 3600,
      max_attempts: 3,
      is_active: true,
    });
  };

  const openEditDialog = (exam: any) => {
    setEditingExam(exam);
    setFormData({
      level_id: exam.level_id,
      title: exam.title,
      description: exam.description || "",
      passing_score: exam.passing_score,
      time_limit_seconds: exam.time_limit_seconds || 3600,
      max_attempts: exam.max_attempts,
      is_active: exam.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingExam) {
      updateMutation.mutate({ id: editingExam.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getLevelName = (level: any) => {
    const lang = i18n.language;
    if (lang === "nl") return level?.name_nl || level?.name;
    if (lang === "ar") return level?.name_ar || level?.name;
    return level?.name_en || level?.name;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.finalExams", "Final Exams")}</h1>
          <p className="text-muted-foreground">
            {t("admin.finalExamsDescription", "Manage level progression exams")}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingExam(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t("admin.createExam", "Create Exam")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : exams && exams.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.exam", "Exam")}</TableHead>
                <TableHead>{t("admin.level", "Level")}</TableHead>
                <TableHead>{t("admin.passingScore", "Passing Score")}</TableHead>
                <TableHead>{t("admin.duration", "Duration")}</TableHead>
                <TableHead>{t("admin.attempts", "Attempts")}</TableHead>
                <TableHead>{t("admin.status", "Status")}</TableHead>
                <TableHead>{t("admin.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => {
                const counts = attemptCounts?.[exam.id] || { total: 0, passed: 0 };
                return (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exam.title}</p>
                        {exam.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {exam.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {getLevelName(exam.level)}
                      </Badge>
                    </TableCell>
                    <TableCell>{exam.passing_score}%</TableCell>
                    <TableCell>
                      {exam.time_limit_seconds 
                        ? formatDuration(exam.time_limit_seconds)
                        : t("admin.noLimit", "No limit")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4" />
                        {counts.passed}/{counts.total}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={exam.is_active ? "default" : "secondary"}>
                        {exam.is_active 
                          ? t("admin.active", "Active") 
                          : t("admin.inactive", "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(exam)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(exam.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t("admin.noExams", "No final exams yet")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("admin.noExamsDescription", "Create exams to enable level progression for students.")}
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.createFirstExam", "Create First Exam")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExam 
                ? t("admin.editExam", "Edit Exam") 
                : t("admin.createExam", "Create Exam")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.examFormDescription", "Configure the final exam for level progression.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("admin.level", "Level")}</Label>
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
                      {getLevelName(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("admin.title", "Title")}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("admin.examTitlePlaceholder", "e.g., Level 1 Final Exam")}
              />
            </div>

            <div>
              <Label>{t("admin.description", "Description")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("admin.passingScore", "Passing Score")} (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 70 })}
                />
              </div>
              <div>
                <Label>{t("admin.maxAttempts", "Max Attempts")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>

            <div>
              <Label>{t("admin.timeLimit", "Time Limit")} ({t("common.min", "min")})</Label>
              <Input
                type="number"
                min={0}
                value={Math.floor(formData.time_limit_seconds / 60)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  time_limit_seconds: (parseInt(e.target.value) || 60) * 60 
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("admin.active", "Active")}</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.level_id || !formData.title || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingExam ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
