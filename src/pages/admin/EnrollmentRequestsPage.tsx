import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminAction } from "@/lib/admin-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

interface PendingEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
  className?: string;
  studentName?: string;
  studentEmail?: string;
}

export default function EnrollmentRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingEnrollments, isLoading } = useQuery({
    queryKey: ["pending-enrollments"],
    queryFn: async () => {
      const data = await apiQuery<any[]>("class_enrollments", (q) =>
        q.select("*").eq("status", "pending").order("enrolled_at", { ascending: false })
      );
      const enriched = await Promise.all(
        (data || []).map(async (enrollment) => {
          const [cls, profile] = await Promise.all([
            apiQuery<any>("classes", (q) => q.select("name").eq("id", enrollment.class_id).single()),
            apiQuery<any>("profiles", (q) => q.select("full_name, email").eq("user_id", enrollment.student_id).single()),
          ]);
          return { ...enrollment, className: cls?.name || "-", studentName: profile?.full_name || "-", studentEmail: profile?.email || "-" } as PendingEnrollment;
        })
      );
      return enriched;
    },
  });

  const processEnrollmentMutation = useMutation({
    mutationFn: async ({ id, studentId, classId, approve }: { id: string; studentId: string; classId: string; approve: boolean }) => {
      if (approve) {
        await apiMutate("class_enrollments", (q) => q.update({ status: "enrolled" }).eq("id", id));
      } else {
        await apiMutate("class_enrollments", (q) => q.delete().eq("id", id));
      }
      const enrollment = pendingEnrollments?.find((e) => e.id === id);
      await apiMutate("notifications", (q) =>
        q.insert({
          user_id: studentId,
          type: approve ? "enrollment_approved" : "enrollment_rejected",
          title: approve ? `Inschrijving goedgekeurd: ${enrollment?.className || ""}` : `Inschrijving afgewezen: ${enrollment?.className || ""}`,
          message: approve ? "Je bent nu ingeschreven en hebt toegang tot de klas." : "Je inschrijving is helaas afgewezen.",
          data: { class_id: classId },
        })
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      if (user) logAdminAction(user.id, variables.approve ? "approve_enrollment" : "reject_enrollment", "class_enrollments", variables.id, { student_id: variables.studentId, class_id: variables.classId });
      toast({ title: variables.approve ? t("admin.enrollmentApproved", "Inschrijving goedgekeurd") : t("admin.enrollmentRejected", "Inschrijving afgewezen") });
    },
    onError: () => { toast({ variant: "destructive", title: t("common.error", "Error") }); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("admin.enrollmentRequests", "Inschrijvingsaanvragen")}</h1>
        <p className="text-muted-foreground">{t("admin.enrollmentRequestsDesc", "Beoordeel en verwerk inschrijvingsaanvragen van studenten.")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("admin.pendingEnrollments", "Wachtende inschrijvingen")} ({pendingEnrollments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : pendingEnrollments && pendingEnrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.student", "Student")}</TableHead>
                  <TableHead>{t("admin.email", "Email")}</TableHead>
                  <TableHead>{t("admin.class", "Klas")}</TableHead>
                  <TableHead>{t("admin.date", "Datum")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions", "Acties")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.studentName}</TableCell>
                    <TableCell>{enrollment.studentEmail}</TableCell>
                    <TableCell><Badge variant="secondary">{enrollment.className}</Badge></TableCell>
                    <TableCell>{formatDate(enrollment.enrolled_at, "PP")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => processEnrollmentMutation.mutate({ id: enrollment.id, studentId: enrollment.student_id, classId: enrollment.class_id, approve: true })} disabled={processEnrollmentMutation.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" />{t("admin.approve", "Goedkeuren")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => processEnrollmentMutation.mutate({ id: enrollment.id, studentId: enrollment.student_id, classId: enrollment.class_id, approve: false })} disabled={processEnrollmentMutation.isPending}>
                          <XCircle className="h-4 w-4 mr-1" />{t("admin.reject", "Afwijzen")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p>{t("admin.noPendingEnrollments", "Geen wachtende inschrijvingen")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
