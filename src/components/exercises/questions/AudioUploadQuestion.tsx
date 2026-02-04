import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Square, Play, Pause, Upload, Loader2, Trash2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AudioUploadQuestionProps {
  value: string | undefined;
  onChange: (url: string) => void;
  attemptId: string | null;
  questionId: string;
  maxDurationSeconds?: number;
  maxFileSizeMB?: number;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_DURATION_SECONDS = 300; // 5 minutes

export function AudioUploadQuestion({ 
  value, 
  onChange, 
  attemptId, 
  questionId,
  maxDurationSeconds = MAX_DURATION_SECONDS,
  maxFileSizeMB = MAX_FILE_SIZE_MB,
}: AudioUploadQuestionProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(value || null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
          ? "audio/webm;codecs=opus" 
          : "audio/webm"
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        // Check file size
        const sizeMB = blob.size / (1024 * 1024);
        if (sizeMB > maxFileSizeMB) {
          toast({
            variant: "destructive",
            title: t("exercises.fileTooLarge", "File Too Large"),
            description: t("exercises.maxAudioSize", `Maximum file size is ${maxFileSizeMB}MB.`),
          });
          return;
        }
        
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioDuration(recordingTime);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        variant: "destructive",
        title: t("exercises.microphoneError", "Microphone Error"),
        description: t("exercises.microphoneAccessDenied", "Please allow microphone access to record audio."),
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("audio/")) {
      toast({
        variant: "destructive",
        title: t("exercises.invalidFile", "Invalid File"),
        description: t("exercises.selectAudioFile", "Please select an audio file."),
      });
      return;
    }
    
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxFileSizeMB) {
      toast({
        variant: "destructive",
        title: t("exercises.fileTooLarge", "File Too Large"),
        description: t("exercises.maxAudioSize", `Maximum file size is ${maxFileSizeMB}MB.`),
      });
      return;
    }
    
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const uploadAudio = async () => {
    if (!audioBlob || !attemptId) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${attemptId}/${questionId}/audio-${Date.now()}.webm`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const { data, error } = await supabase.storage
        .from("student-uploads")
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type,
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
        title: t("exercises.audioUploaded", "Audio Uploaded"),
        description: t("exercises.audioUploadedDesc", "Your audio recording has been saved."),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("exercises.uploadFailed", "Failed to upload audio. Please try again."),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioDuration(0);
    onChange("");
  };

  return (
    <div className="space-y-4">
      {/* Timer display during recording */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 p-4 bg-destructive/10 rounded-lg animate-pulse">
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <Clock className="h-5 w-5 text-destructive" />
          <span className="text-2xl font-mono font-bold text-destructive">
            {formatTime(recordingTime)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatTime(maxDurationSeconds)}
          </span>
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {!isRecording ? (
          <Button 
            onClick={startRecording} 
            variant="outline"
            className="gap-2"
            disabled={isUploading || !!audioUrl}
          >
            <Mic className="h-4 w-4 text-destructive" />
            {t("exercises.startRecording", "Start Recording")}
          </Button>
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
        
        {!isRecording && !audioUrl && (
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
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File size info */}
      <p className="text-xs text-muted-foreground">
        {t("exercises.audioLimits", `Max duration: ${Math.floor(maxDurationSeconds / 60)} min | Max size: ${maxFileSizeMB}MB`)}
      </p>

      {/* Audio preview */}
      {audioUrl && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayback}
            disabled={isRecording}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <audio 
            ref={audioRef} 
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          
          <div className="flex-1">
            <div className="h-8 bg-primary/20 rounded-full overflow-hidden flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {t("exercises.audioRecorded", "Audio recorded")}
                {audioDuration > 0 && ` (${formatTime(audioDuration)})`}
              </span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearRecording}
            disabled={isUploading}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
      {audioBlob && !value && (
        <Button 
          onClick={uploadAudio} 
          disabled={isUploading || isRecording}
          className="w-full gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t("exercises.uploadAudio", "Upload Audio")}
        </Button>
      )}

      {/* Uploaded confirmation */}
      {value && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ {t("exercises.audioSaved", "Audio has been saved successfully")}
          </p>
        </div>
      )}
    </div>
  );
}