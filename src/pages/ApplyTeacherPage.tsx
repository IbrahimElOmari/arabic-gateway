import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GraduationCap, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApplyTeacherPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  // Fetch levels for selection
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

  // Check if user already has a pending/approved application
  const { data: existingApplication, isLoading: checkingApplication } = useQuery({
    queryKey: ["my-teacher-application", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("teacher_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("teacher_applications").insert({
        user_id: user.id,
        qualifications,
        experience,
        requested_levels: selectedLevels,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("applyTeacher.submitted", "Aanvraag ingediend"),
        description: t("applyTeacher.submittedDesc", "Je aanvraag wordt beoordeeld door een beheerder."),
      });
      navigate("/settings");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("applyTeacher.submitError", "Aanvraag kon niet worden ingediend."),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualifications.trim() || !experience.trim()) return;
    submitMutation.mutate();
  };

  const toggleLevel = (levelId: string) => {
    setSelectedLevels((prev) =>
      prev.includes(levelId) ? prev.filter((id) => id !== levelId) : [...prev, levelId]
    );
  };

  if (checkingApplication) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show existing application status
  if (existingApplication && existingApplication.status !== "rejected") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            {existingApplication.status === "approved" ? (
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            ) : (
              <Clock className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
            )}
            <CardTitle>
              {existingApplication.status === "approved"
                ? t("applyTeacher.approved", "Aanvraag goedgekeurd!")
                : t("applyTeacher.pending", "Aanvraag in behandeling")}
            </CardTitle>
            <CardDescription>
              {existingApplication.status === "approved"
                ? t("applyTeacher.approvedDesc", "Je hebt de rol van docent ontvangen.")
                : t("applyTeacher.pendingDesc", "Je aanvraag wordt momenteel beoordeeld door een beheerder.")}
            </CardDescription>
          </CardHeader>
          {existingApplication.review_notes && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <strong>{t("applyTeacher.reviewNotes", "Feedback")}:</strong>{" "}
                {existingApplication.review_notes}
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{t("applyTeacher.title", "Word docent")}</CardTitle>
              <CardDescription>
                {t("applyTeacher.description", "Dien een aanvraag in om les te geven op ons platform.")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="qualifications">
                {t("applyTeacher.qualifications", "Kwalificaties")} *
              </Label>
              <Textarea
                id="qualifications"
                placeholder={t("applyTeacher.qualificationsPlaceholder", "Beschrijf je diploma's, certificaten en relevante opleidingen...")}
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">
                {t("applyTeacher.experience", "Ervaring")} *
              </Label>
              <Textarea
                id="experience"
                placeholder={t("applyTeacher.experiencePlaceholder", "Beschrijf je leservaring, met name in het Arabisch onderwijs...")}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>{t("applyTeacher.preferredLevels", "Gewenste niveaus")}</Label>
              <div className="grid grid-cols-2 gap-3">
                {levels?.map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => toggleLevel(level.id)}
                  >
                    <Checkbox
                      checked={selectedLevels.includes(level.id)}
                      onCheckedChange={() => toggleLevel(level.id)}
                    />
                    <span className="text-sm font-medium">{level.name}</span>
                  </div>
                ))}
              </div>
              {selectedLevels.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedLevels.map((id) => {
                    const level = levels?.find((l) => l.id === id);
                    return level ? (
                      <Badge key={id} variant="secondary">{level.name}</Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending || !qualifications.trim() || !experience.trim()}
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("applyTeacher.submit", "Aanvraag indienen")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
