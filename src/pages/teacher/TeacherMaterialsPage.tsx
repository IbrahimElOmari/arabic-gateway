import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Plus, Upload, Trash2, FileText, Video, File, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const fileTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  video: Video,
  document: FileText,
  default: File,
};

export default function TeacherMaterialsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [uploading, setUploading] = useState(false);

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

  const classIds = classes?.map((c) => c.id) || [];

  // Get lessons for teacher's classes
  const { data: lessons } = useQuery({
    queryKey: ["teacher-lessons-for-materials", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, class:classes(name)")
        .in("class_id", classIds)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: classIds.length > 0,
  });

  // Get materials
  const { data: materials, isLoading } = useQuery({
    queryKey: ["teacher-materials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_materials")
        .select("*, lesson:lessons(title, class:classes(name))")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-materials"] });
      toast({
        title: t("teacher.materialDeleted", "Material Deleted"),
      });
    },
  });

  const handleUpload = async () => {
    if (!uploadFile || !selectedLesson || !materialTitle) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `lessons/${selectedLesson}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("lesson-materials")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("lesson-materials")
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase.from("lesson_materials").insert({
        lesson_id: selectedLesson,
        title: materialTitle,
        file_url: urlData.publicUrl,
        file_type: fileExt || "unknown",
        uploaded_by: user!.id,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["teacher-materials"] });
      setShowUploadDialog(false);
      setUploadFile(null);
      setMaterialTitle("");
      setSelectedLesson("");

      toast({
        title: t("teacher.materialUploaded", "Material Uploaded"),
        description: t("teacher.materialUploadedDescription", "The file has been uploaded successfully."),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: error.message || t("teacher.uploadError", "Failed to upload file."),
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") return fileTypeIcons.pdf;
    if (["mp4", "webm", "mov"].includes(fileType)) return fileTypeIcons.video;
    if (["doc", "docx"].includes(fileType)) return fileTypeIcons.document;
    return fileTypeIcons.default;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("teacher.materials", "Lesson Materials")}</h1>
          <p className="text-muted-foreground">
            {t("teacher.materialsDescription", "Upload and manage materials for your lessons")}
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          {t("teacher.uploadMaterial", "Upload Material")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.title", "Title")}</TableHead>
                <TableHead>{t("teacher.lesson", "Lesson")}</TableHead>
                <TableHead>{t("admin.class", "Class")}</TableHead>
                <TableHead>{t("admin.type", "Type")}</TableHead>
                <TableHead>{t("admin.uploaded", "Uploaded")}</TableHead>
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
              ) : materials && materials.length > 0 ? (
                materials.map((material) => {
                  const Icon = getFileIcon(material.file_type);
                  return (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {material.title}
                        </div>
                      </TableCell>
                      <TableCell>{material.lesson?.title}</TableCell>
                      <TableCell>{material.lesson?.class?.name}</TableCell>
                      <TableCell className="uppercase text-xs">{material.file_type}</TableCell>
                      <TableCell>{format(new Date(material.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMaterialMutation.mutate(material.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("teacher.noMaterials", "No materials uploaded yet")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacher.uploadMaterial", "Upload Material")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("teacher.lesson", "Lesson")}</Label>
              <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                <SelectTrigger>
                  <SelectValue placeholder={t("teacher.selectLesson", "Select a lesson")} />
                </SelectTrigger>
                <SelectContent>
                  {lessons?.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title} ({lesson.class?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("common.title", "Title")}</Label>
              <Input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder={t("teacher.materialTitlePlaceholder", "e.g. Lesson 1 Slides")}
              />
            </div>

            <div>
              <Label>{t("teacher.file", "File")}</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm,.mp3,.wav"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("teacher.allowedFileTypes", "PDF, Word, PowerPoint, Video, Audio")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !selectedLesson || !materialTitle || uploading}
            >
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.upload", "Upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
