import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, CheckCircle, Clock, Loader2, User, Video, GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface PlacementTest {
  id: string;
  user_id: string;
  scheduled_at: string | null;
  meet_link: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  assigned_level_id: string | null;
  assessment_notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
  level?: {
    name_nl: string;
    name_en: string;
    name_ar: string;
  };
}

interface Level {
  id: string;
  name_nl: string;
  name_en: string;
  name_ar: string;
}

export default function PlacementsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementTest | null>(null);
  const [dialogType, setDialogType] = useState<"schedule" | "complete" | null>(null);
  
  // Schedule form state
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetLink, setMeetLink] = useState("");
  
  // Complete form state
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [assessmentNotes, setAssessmentNotes] = useState("");

  // Fetch placement tests
  const { data: placements, isLoading } = useQuery({
    queryKey: ["placement-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_tests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile and level info for each placement
      const placementsWithDetails = await Promise.all(
        (data || []).map(async (placement) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", placement.user_id)
            .maybeSingle();

          let level = null;
          if (placement.assigned_level_id) {
            const { data: levelData } = await supabase
              .from("levels")
              .select("name_nl, name_en, name_ar")
              .eq("id", placement.assigned_level_id)
              .maybeSingle();
            level = levelData;
          }

          return {
            ...placement,
            profile,
            level,
          } as PlacementTest;
        })
      );

      return placementsWithDetails;
    },
  });

  // Fetch levels
  const { data: levels } = useQuery({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levels")
        .select("id, name_nl, name_en, name_ar")
        .order("display_order");
      
      if (error) throw error;
      return data as Level[];
    },
  });

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async ({ userId, scheduledAt, meetLink }: { userId: string; scheduledAt: string; meetLink: string }) => {
      const { error } = await supabase
        .from("placement_tests")
        .update({
          scheduled_at: scheduledAt,
          meet_link: meetLink,
          status: "scheduled" as const,
        })
        .eq("user_id", userId)
        .eq("status", "pending" as const);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-tests"] });
      toast({
        title: t("admin.placementScheduled", "Placement Test Scheduled"),
        description: t("admin.placementScheduledDescription", "The student has been notified."),
      });
      closeDialog();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.schedulePlacementError", "Failed to schedule placement test."),
      });
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async ({ 
      placementId, 
      levelId, 
      notes 
    }: { 
      placementId: string; 
      levelId: string; 
      notes: string;
    }) => {
      const { error } = await supabase
        .from("placement_tests")
        .update({
          status: "completed" as const,
          assigned_level_id: levelId,
          assessment_notes: notes || null,
        })
        .eq("id", placementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-tests"] });
      toast({
        title: t("admin.placementCompleted", "Placement Test Completed"),
        description: t("admin.placementCompletedDescription", "Level has been assigned."),
      });
      closeDialog();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.completePlacementError", "Failed to complete placement test."),
      });
    },
  });

  const closeDialog = () => {
    setSelectedPlacement(null);
    setDialogType(null);
    setScheduledAt("");
    setMeetLink("");
    setSelectedLevelId("");
    setAssessmentNotes("");
  };

  const handleSchedule = () => {
    if (selectedPlacement && scheduledAt && meetLink) {
      scheduleMutation.mutate({
        userId: selectedPlacement.user_id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        meetLink,
      });
    }
  };

  const handleComplete = () => {
    if (selectedPlacement && selectedLevelId) {
      completeMutation.mutate({
        placementId: selectedPlacement.id,
        levelId: selectedLevelId,
        notes: assessmentNotes,
      });
    }
  };

  const getLevelName = (level: { name_nl?: string; name_en?: string; name_ar?: string } | null | undefined) => {
    if (!level) return "";
    const lang = i18n.language;
    return lang === "ar" ? level.name_ar : lang === "en" ? level.name_en : level.name_nl;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            {t("admin.pending", "Pending")}
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="text-blue-600">
            <Calendar className="h-3 w-3 mr-1" />
            {t("admin.scheduled", "Scheduled")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("admin.completed", "Completed")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            {t("admin.cancelled", "Cancelled")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingPlacements = placements?.filter((p) => p.status === "pending") || [];
  const scheduledPlacements = placements?.filter((p) => p.status === "scheduled") || [];
  const completedPlacements = placements?.filter((p) => p.status === "completed") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.placementTests", "Placement Tests")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.placementTestsDescription", "Schedule and manage student placement tests")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.pendingTests", "Pending Tests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPlacements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.scheduledTests", "Scheduled Tests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledPlacements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.completedTests", "Completed Tests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPlacements.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Placements */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t("admin.awaitingScheduling", "Awaiting Scheduling")}
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : pendingPlacements.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingPlacements.map((placement) => (
              <Card key={placement.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {placement.profile?.full_name || "Unknown"}
                        </CardTitle>
                        <CardDescription>{placement.profile?.email}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {t("admin.registeredOn", "Registered on")}{" "}
                    {new Date(placement.created_at).toLocaleDateString()}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogType("schedule");
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {t("admin.scheduleMeeting", "Schedule Meeting")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-muted-foreground">
                {t("admin.noPendingPlacements", "No pending placement tests")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scheduled Placements */}
      {scheduledPlacements.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {t("admin.scheduledMeetings", "Scheduled Meetings")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduledPlacements.map((placement) => (
              <Card key={placement.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {placement.profile?.full_name || "Unknown"}
                        </CardTitle>
                        <CardDescription>{placement.profile?.email}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(placement.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{t("admin.scheduledFor", "Scheduled for")}</p>
                    <p className="text-sm text-muted-foreground">
                      {placement.scheduled_at && new Date(placement.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  {placement.meet_link && (
                    <a
                      href={placement.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t("admin.joinMeeting", "Join Meeting")}
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogType("complete");
                    }}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    {t("admin.completeAssessment", "Complete Assessment")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Placements */}
      {completedPlacements.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {t("admin.recentlyCompleted", "Recently Completed")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedPlacements.slice(0, 6).map((placement) => (
              <Card key={placement.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {placement.profile?.full_name || "Unknown"}
                      </CardTitle>
                      <CardDescription>{placement.profile?.email}</CardDescription>
                    </div>
                    {getStatusBadge(placement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {getLevelName(placement.level)}
                    </span>
                  </div>
                  {placement.assessment_notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {placement.assessment_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={dialogType === "schedule"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.schedulePlacementTest", "Schedule Placement Test")}</DialogTitle>
            <DialogDescription>
              {t("admin.schedulePlacementDescription", "Set a date and time for the placement meeting.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.dateTime", "Date & Time")}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.meetLink", "Meeting Link")}</Label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!scheduledAt || !meetLink || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.schedule", "Schedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={dialogType === "complete"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.completeAssessment", "Complete Assessment")}</DialogTitle>
            <DialogDescription>
              {t("admin.completeAssessmentDescription", "Assign a level based on the placement test results.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.assignLevel", "Assign Level")}</Label>
              <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectLevel", "Select a level")} />
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
            <div className="space-y-2">
              <Label>{t("admin.assessmentNotes", "Assessment Notes")}</Label>
              <Textarea
                placeholder={t("admin.assessmentNotesPlaceholder", "Add notes about the assessment...")}
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!selectedLevelId || completeMutation.isPending}
            >
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.complete", "Complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
