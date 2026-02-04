import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Video, Square, Upload, Loader2, Trash2, Camera, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VideoUploadQuestionProps {
  value: string | undefined;
  onChange: (url: string) => void;
  attemptId: string | null;
  questionId: string;
  maxDurationSeconds?: number;
  maxFileSizeMB?: number;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_DURATION_SECONDS = 180; // 3 minutes

export function VideoUploadQuestion({ 
  value, 
  onChange, 
  attemptId, 
  questionId,
  maxDurationSeconds = MAX_DURATION_SECONDS,
  maxFileSizeMB = MAX_FILE_SIZE_MB,
}: VideoUploadQuestionProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(value || null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Auto-stop recording when max duration reached
  useEffect(() => {
    if (recordingTime >= maxDurationSeconds && isRecording) {
      stopRecording();
      toast({
        title: t("exercises.maxDurationReached", "Maximum Duration Reached"),
        description: t("exercises.recordingStopped", "Recording automatically stopped."),
      });
    }
  }, [recordingTime, maxDurationSeconds, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: true 
      });
      
      setStream(mediaStream);
      setIsPreviewing(true);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Failed to access camera:", error);
      toast({
        variant: "destructive",
        title: t("exercises.cameraError", "Camera Error"),
        description: t("exercises.cameraAccessDenied", "Please allow camera access to record video."),
      });
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") 
        ? "video/webm;codecs=vp9" 
        : "video/webm"
    });
    
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      
      // Check file size
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > maxFileSizeMB) {
        toast({
          variant: "destructive",
          title: t("exercises.fileTooLarge", "File Too Large"),
          description: t("exercises.maxFileSize", `Maximum file size is ${maxFileSizeMB}MB.`),
        });
        return;
      }
      
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop camera preview
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsPreviewing(false);
    }
  };

  const cancelPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsPreviewing(false);
    setRecordingTime(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("video/")) {
      toast({
        variant: "destructive",
        title: t("exercises.invalidFile", "Invalid File"),
        description: t("exercises.selectVideoFile", "Please select a video file."),
      });
      return;
    }
    
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxFileSizeMB) {
      toast({
        variant: "destructive",
        title: t("exercises.fileTooLarge", "File Too Large"),
        description: t("exercises.maxFileSize", `Maximum file size is ${maxFileSizeMB}MB.`),
      });
      return;
    }
    
    setVideoBlob(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const uploadVideo = async () => {
    if (!videoBlob || !attemptId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${attemptId}/${questionId}/video-${Date.now()}.webm`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 200);
      
      const { data, error } = await supabase.storage
        .from("student-uploads")
        .upload(fileName, videoBlob, {
          contentType: videoBlob.type,
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
        title: t("exercises.videoUploaded", "Video Uploaded"),
        description: t("exercises.videoUploadedDesc", "Your video recording has been saved."),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("exercises.uploadFailed", "Failed to upload video. Please try again."),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearRecording = () => {
    setVideoBlob(null);
    setVideoUrl(null);
    setRecordingTime(0);
    onChange("");
  };

  return (
    <div className="space-y-4">
      {/* Camera preview with timer */}
      {isPreviewing && (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover"
          />
          {isRecording && (
            <>
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full animate-pulse">
                <div className="w-2 h-2 rounded-full bg-current" />
                <span className="text-sm font-medium">REC</span>
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 text-foreground px-3 py-1 rounded-full">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono font-bold">
                  {formatTime(recordingTime)} / {formatTime(maxDurationSeconds)}
                </span>
              </div>
              {/* Progress bar for time limit */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50">
                <div 
                  className="h-full bg-destructive transition-all duration-1000"
                  style={{ width: `${(recordingTime / maxDurationSeconds) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Video playback */}
      {videoUrl && !isPreviewing && (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <video
            ref={videoPlaybackRef}
            src={videoUrl}
            controls
            className="w-full aspect-video"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearRecording}
            disabled={isUploading}
            className="absolute top-2 right-2 bg-background/80 text-destructive hover:bg-background"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Recording controls */}
      {!videoUrl && (
        <div className="flex items-center gap-4 flex-wrap">
          {!isPreviewing ? (
            <Button 
              onClick={startCamera} 
              variant="outline"
              className="gap-2"
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
              {t("exercises.openCamera", "Open Camera")}
            </Button>
          ) : !isRecording ? (
            <>
              <Button 
                onClick={startRecording} 
                variant="destructive"
                className="gap-2"
              >
                <Video className="h-4 w-4" />
                {t("exercises.startRecording", "Start Recording")}
              </Button>
              <Button 
                onClick={cancelPreview} 
                variant="outline"
              >
                {t("common.cancel", "Cancel")}
              </Button>
            </>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              {t("exercises.stopRecording", "Stop Recording")}
            </Button>
          )}
          
          {!isPreviewing && (
            <>
              <span className="text-muted-foreground">{t("common.or", "or")}</span>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {t("exercises.uploadFile", "Upload File")}
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
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
      {videoBlob && !value && (
        <Button 
          onClick={uploadVideo} 
          disabled={isUploading}
          className="w-full gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t("exercises.uploadVideo", "Upload Video")}
        </Button>
      )}

      {/* Uploaded confirmation */}
      {value && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ {t("exercises.videoSaved", "Video has been saved successfully")}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("exercises.videoLimits", `Max duration: ${Math.floor(maxDurationSeconds / 60)} min | Max size: ${maxFileSizeMB}MB | Formats: MP4, WebM`)}
      </p>
    </div>
  );
}