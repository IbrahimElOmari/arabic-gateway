import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Square, Play, Pause, Upload, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AudioUploadQuestionProps {
  value: string | undefined;
  onChange: (url: string) => void;
  attemptId: string | null;
  questionId: string;
}

export function AudioUploadQuestion({ value, onChange, attemptId, questionId }: AudioUploadQuestionProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(value || null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") 
          ? "audio/webm;codecs=opus" 
          : "audio/webm"
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
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
      
      // Simulate progress (Supabase doesn't provide real upload progress)
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
    onChange("");
  };

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button 
            onClick={startRecording} 
            variant="outline"
            className="gap-2"
            disabled={isUploading}
          >
            <Mic className="h-4 w-4 text-destructive" />
            {t("exercises.startRecording", "Start Recording")}
          </Button>
        ) : (
          <Button 
            onClick={stopRecording} 
            variant="destructive"
            className="gap-2 animate-pulse"
          >
            <Square className="h-4 w-4" />
            {t("exercises.stopRecording", "Stop Recording")}
          </Button>
        )}
        
        <span className="text-muted-foreground">{t("common.or", "or")}</span>
        
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording || isUploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {t("exercises.uploadFile", "Upload File")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

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
            <div className="h-8 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                {t("exercises.audioRecorded", "Audio recorded")}
              </div>
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
