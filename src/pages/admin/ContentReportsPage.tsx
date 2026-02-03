import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Flag, CheckCircle, XCircle, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ContentReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<any>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["content-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("content_reports")
        .update({
          status,
          review_notes: notes,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-reports"] });
      setSelectedReport(null);
      setReviewNotes("");
      toast({
        title: t("moderation.reportUpdated", "Report Updated"),
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (report: any) => {
      // Delete the content based on type
      if (report.content_type === "forum_post") {
        const { error } = await supabase
          .from("forum_posts")
          .delete()
          .eq("id", report.content_id);
        if (error) throw error;
      } else if (report.content_type === "forum_comment") {
        const { error } = await supabase
          .from("forum_comments")
          .delete()
          .eq("id", report.content_id);
        if (error) throw error;
      } else if (report.content_type === "chat_message") {
        const { error } = await supabase
          .from("chat_messages")
          .delete()
          .eq("id", report.content_id);
        if (error) throw error;
      }

      // Update report status to resolved
      const { error: updateError } = await supabase
        .from("content_reports")
        .update({
          status: "resolved",
          review_notes: "Content deleted by moderator",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", report.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-reports"] });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      toast({
        title: t("moderation.contentDeleted", "Content Deleted"),
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">{t("moderation.pending", "Pending")}</Badge>;
      case "reviewed":
        return <Badge variant="secondary">{t("moderation.reviewed", "Reviewed")}</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">{t("moderation.resolved", "Resolved")}</Badge>;
      case "dismissed":
        return <Badge variant="destructive">{t("moderation.dismissed", "Dismissed")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: t("moderation.spam", "Spam"),
      harassment: t("moderation.harassment", "Harassment"),
      inappropriate: t("moderation.inappropriate", "Inappropriate"),
      misinformation: t("moderation.misinformation", "Misinformation"),
      other: t("moderation.other", "Other"),
    };
    return labels[reason] || reason;
  };

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      forum_post: t("moderation.forumPost", "Forum Post"),
      forum_comment: t("moderation.forumComment", "Forum Comment"),
      chat_message: t("moderation.chatMessage", "Chat Message"),
    };
    return labels[type] || type;
  };

  const handleReview = (status: string) => {
    if (selectedReport) {
      updateReportMutation.mutate({
        id: selectedReport.id,
        status,
        notes: reviewNotes,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("moderation.contentReports", "Content Reports")}</h1>
        <p className="text-muted-foreground">
          {t("moderation.contentReportsDescription", "Review and manage reported content")}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", "All")}</SelectItem>
            <SelectItem value="pending">{t("moderation.pending", "Pending")}</SelectItem>
            <SelectItem value="reviewed">{t("moderation.reviewed", "Reviewed")}</SelectItem>
            <SelectItem value="resolved">{t("moderation.resolved", "Resolved")}</SelectItem>
            <SelectItem value="dismissed">{t("moderation.dismissed", "Dismissed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("moderation.contentType", "Content Type")}</TableHead>
                <TableHead>{t("moderation.reason", "Reason")}</TableHead>
                <TableHead>{t("moderation.status", "Status")}</TableHead>
                <TableHead>{t("moderation.reportedAt", "Reported At")}</TableHead>
                <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : reports && reports.length > 0 ? (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{getContentTypeLabel(report.content_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getReasonLabel(report.reason)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{format(new Date(report.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setReviewNotes(report.review_notes || "");
                          setNewStatus(report.status);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("moderation.review", "Review")}
                      </Button>
                      {report.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setReportToDelete(report);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("moderation.noReports", "No reports found")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("moderation.reviewReport", "Review Report")}</DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <>
                  {getContentTypeLabel(selectedReport.content_type)} - {getReasonLabel(selectedReport.reason)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium mb-1">{t("moderation.reporterDescription", "Reporter's description:")}</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">{t("moderation.reviewNotes", "Review notes:")}</p>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t("moderation.notesPlaceholder", "Add notes about your review...")}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleReview("dismissed")}
              disabled={updateReportMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("moderation.dismiss", "Dismiss")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview("reviewed")}
              disabled={updateReportMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t("moderation.markReviewed", "Mark Reviewed")}
            </Button>
            <Button
              onClick={() => handleReview("resolved")}
              disabled={updateReportMutation.isPending}
            >
              {updateReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t("moderation.resolve", "Resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Content Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("moderation.deleteContent", "Delete Content")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "moderation.deleteContentDescription",
                "This will permanently delete the reported content. This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && deleteContentMutation.mutate(reportToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
