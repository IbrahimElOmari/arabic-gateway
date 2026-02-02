import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Upload, File, Loader2, Trash2, Download, Image, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileUploadQuestionProps {
  value: string | undefined;
  onChange: (url: string) => void;
  attemptId: string | null;
  questionId: string;
}

export function FileUploadQuestion({ value, onChange, attemptId, questionId }: FileUploadQuestionProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Check file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("exercises.fileTooLarge", "File Too Large"),
        description: t("exercises.maxFileSizeGeneral", "Maximum file size is 20MB."),
      });
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !attemptId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const ext = selectedFile.name.split(".").pop() || "file";
      const fileName = `${attemptId}/${questionId}/file-${Date.now()}.${ext}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const { data, error } = await supabase.storage
        .from("student-uploads")
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: true,
        });
      
      clearInterval(progressInterval);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from("student-uploads")
        .getPublicUrl(fileName);
      
      setUploadProgress(100);
      onChange(publicUrl);
      
      toast({
        title: t("exercises.fileUploaded", "File Uploaded"),
        description: t("exercises.fileUploadedDesc", "Your file has been saved."),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("exercises.uploadFailed", "Failed to upload file. Please try again."),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-8 w-8 text-muted-foreground" />;
    if (selectedFile.type.startsWith("image/")) return <Image className="h-8 w-8 text-primary" />;
    if (selectedFile.type.includes("pdf")) return <FileText className="h-8 w-8 text-destructive" />;
    return <File className="h-8 w-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!selectedFile && !value && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground mb-1">
            {t("exercises.dropFileHere", "Drop your file here or click to browse")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("exercises.supportedFormats", "PDF, Word, Images, and more (max 20MB)")}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File preview */}
      {selectedFile && !value && (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-4">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
                {getFileIcon()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearFile}
              disabled={isUploading}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {t("exercises.uploading", "Uploading...")} {uploadProgress}%
          </p>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !value && (
        <Button 
          onClick={uploadFile} 
          disabled={isUploading}
          className="w-full gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t("exercises.uploadFile", "Upload File")}
        </Button>
      )}

      {/* Uploaded confirmation */}
      {value && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ {t("exercises.fileSaved", "File has been saved successfully")}
            </p>
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              {t("common.download", "Download")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
