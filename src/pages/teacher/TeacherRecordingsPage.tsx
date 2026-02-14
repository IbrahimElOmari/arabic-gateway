import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Plus, Loader2, Upload, Play, Trash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function TeacherRecordingsPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Get lessons for recording
  const { data: lessons } = useQuery({
    queryKey: ["teacher-lessons-for-recording", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, class:classes(name)")
        .in("class_id", classIds)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  // Get recordings
  const { data: recordings, isLoading } = useQuery({
    queryKey: ["teacher-recordings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_recordings")
        .select("*, lesson:lessons(title, class:classes(name))")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedLesson}/${Date.now()}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from("lesson-recordings")
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lesson-recordings")
        .getPublicUrl(fileName);

      // Create recording record
      const { error: recordError } = await supabase.from("lesson_recordings").insert({
        lesson_id: selectedLesson,
        video_url: urlData.publicUrl,
        uploaded_by: user!.id,
        duration_seconds: null, // Could be extracted from video metadata
      });

      if (recordError) throw recordError;

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["teacher-recordings"] });
      setIsDialogOpen(false);
      setSelectedLesson("");
      toast({ title: t("teacher.recordingUploaded", "Recording uploaded successfully") });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteRecordingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_recordings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-recordings"] });
      toast({ title: t("teacher.recordingDeleted", "Recording deleted") });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("teacher.recordings", "Recordings")}</h1>
          <p className="text-muted-foreground">{t("teacher.manageRecordings", "Upload and manage lesson recordings")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("teacher.uploadRecording", "Upload Recording")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("teacher.uploadRecording", "Upload Recording")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("teacher.selectLesson", "Select Lesson")}</Label>
                <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("teacher.chooseLessonForRecording", "Choose a lesson")} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons?.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title} - {lesson.class?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("teacher.videoFile", "Video File")}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={!selectedLesson || isUploading}
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedLesson || isUploading}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <Progress value={uploadProgress} className="w-full" />
                      <span className="text-sm">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6" />
                      <span>{t("teacher.clickToUpload", "Click to upload video")}</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : recordings && recordings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card key={recording.id}>
              <CardHeader>
                <CardTitle className="text-lg">{recording.lesson?.title}</CardTitle>
                <CardDescription>
                  {recording.lesson?.class?.name} · {format(new Date(recording.created_at), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button className="flex-1" asChild>
                    <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                      <Play className="h-4 w-4 mr-2" />
                      {t("teacher.watch", "Watch")}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteRecordingMutation.mutate(recording.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("teacher.noRecordings", "No recordings yet")}</h3>
            <p className="text-muted-foreground">{t("teacher.uploadFirstRecording", "Upload your first lesson recording")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
