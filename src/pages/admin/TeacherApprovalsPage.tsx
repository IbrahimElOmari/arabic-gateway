import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Loader2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherApplication {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  qualifications: string | null;
  experience: string | null;
  review_notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export default function TeacherApprovalsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<TeacherApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  // Fetch teacher applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ["teacher-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", app.user_id)
            .maybeSingle();

          return {
            ...app,
            profile,
          } as TeacherApplication;
        })
      );

      return applicationsWithProfiles;
    },
  });

  // Process application mutation
  const processApplicationMutation = useMutation({
    mutationFn: async ({
      applicationId,
      userId,
      status,
      notes,
    }: {
      applicationId: string;
      userId: string;
      status: "approved" | "rejected";
      notes: string;
    }) => {
      // Update application status
      const { error: updateError } = await supabase
        .from("teacher_applications")
        .update({
          status,
          review_notes: notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // If approved, update user role to teacher
      if (status === "approved") {
        // Delete existing role
        await supabase.from("user_roles").delete().eq("user_id", userId);

        // Insert teacher role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "teacher" });

        if (roleError) throw roleError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title:
          variables.status === "approved"
            ? t("admin.applicationApproved", "Application Approved")
            : t("admin.applicationRejected", "Application Rejected"),
        description:
          variables.status === "approved"
            ? t("admin.teacherRoleGranted", "Teacher role has been granted.")
            : t("admin.applicationRejectedDescription", "Application has been rejected."),
      });
      setSelectedApplication(null);
      setActionType(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.processApplicationError", "Failed to process application."),
      });
    },
  });

  const handleProcess = () => {
    if (selectedApplication && actionType) {
      processApplicationMutation.mutate({
        applicationId: selectedApplication.id,
        userId: selectedApplication.user_id,
        status: actionType === "approve" ? "approved" : "rejected",
        notes: reviewNotes,
      });
    }
  };

  const pendingApplications = applications?.filter((a) => a.status === "pending") || [];
  const processedApplications = applications?.filter((a) => a.status !== "pending") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            {t("admin.pending", "Pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("admin.approved", "Approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("admin.rejected", "Rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.teacherApprovals", "Teacher Approvals")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.teacherApprovalsDescription", "Review and approve teacher applications")}
        </p>
      </div>

      {/* Pending Applications */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t("admin.pendingApplications", "Pending Applications")} ({pendingApplications.length})
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : pendingApplications.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingApplications.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {app.profile?.full_name || "Unknown"}
                        </CardTitle>
                        <CardDescription>{app.profile?.email}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {app.qualifications && (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("admin.qualifications", "Qualifications")}
                      </p>
                      <p className="text-sm text-muted-foreground">{app.qualifications}</p>
                    </div>
                  )}
                  {app.experience && (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {t("admin.experience", "Experience")}
                      </p>
                      <p className="text-sm text-muted-foreground">{app.experience}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("admin.appliedOn", "Applied on")}{" "}
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(app);
                        setActionType("approve");
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t("admin.approve", "Approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedApplication(app);
                        setActionType("reject");
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t("admin.reject", "Reject")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-muted-foreground">
                {t("admin.noPendingApplications", "No pending applications")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Processed Applications */}
      {processedApplications.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {t("admin.processedApplications", "Processed Applications")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {processedApplications.map((app) => (
              <Card key={app.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {app.profile?.full_name || "Unknown"}
                      </CardTitle>
                      <CardDescription>{app.profile?.email}</CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                {app.review_notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{app.review_notes}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog
        open={!!selectedApplication && !!actionType}
        onOpenChange={() => {
          setSelectedApplication(null);
          setActionType(null);
          setReviewNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? t("admin.approveApplication", "Approve Application")
                : t("admin.rejectApplication", "Reject Application")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? t(
                    "admin.approveDescription",
                    "This will grant teacher privileges to the user."
                  )
                : t(
                    "admin.rejectDescription",
                    "The user will be notified of the rejection."
                  )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t("admin.reviewNotes", "Add review notes (optional)...")}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApplication(null);
                setActionType(null);
                setReviewNotes("");
              }}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleProcess}
              disabled={processApplicationMutation.isPending}
            >
              {processApplicationMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === "approve"
                ? t("admin.approve", "Approve")
                : t("admin.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
