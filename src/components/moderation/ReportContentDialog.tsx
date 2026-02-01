import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Flag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "forum_post" | "forum_comment" | "chat_message";
  contentId: string;
}

const reportReasons = [
  { value: "spam", labelKey: "moderation.spam" },
  { value: "harassment", labelKey: "moderation.harassment" },
  { value: "inappropriate", labelKey: "moderation.inappropriate" },
  { value: "misinformation", labelKey: "moderation.misinformation" },
  { value: "other", labelKey: "moderation.other" },
];

export function ReportContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
}: ReportContentDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: user!.id,
        content_type: contentType,
        content_id: contentId,
        reason,
        description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("moderation.reportSubmitted", "Report Submitted"),
        description: t("moderation.reportSubmittedDescription", "Thank you for helping keep our community safe."),
      });
      onOpenChange(false);
      setReason("");
      setDescription("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("moderation.reportError", "Failed to submit report. Please try again."),
      });
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("moderation.selectReason", "Please select a reason for reporting."),
      });
      return;
    }
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            {t("moderation.reportContent", "Report Content")}
          </DialogTitle>
          <DialogDescription>
            {t("moderation.reportDescription", "Help us understand what's wrong with this content.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">
              {t("moderation.reasonLabel", "Why are you reporting this?")}
            </Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-3 space-y-2">
              {reportReasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {t(r.labelKey, r.value)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description">
              {t("moderation.additionalDetails", "Additional details (optional)")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("moderation.detailsPlaceholder", "Provide any additional context...")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={reportMutation.isPending}>
            {reportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("moderation.submitReport", "Submit Report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
