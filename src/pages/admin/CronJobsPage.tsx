import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRpc, apiQuery } from "@/lib/supabase-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { formatDateTime } from "@/lib/date-utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
  RefreshCw,
  Activity,
  BellRing,
  Skull,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CronJobStatus {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
  last_run_status: string | null;
  last_run_duration_ms: number | null;
  last_run_return_message: string | null;
}

interface CronAlertRow {
  id: string;
  jobid: number;
  jobname: string;
  status: string;
  return_message: string | null;
  started_at: string | null;
  ended_at: string | null;
  notified_at: string | null;
  notification_attempts: number;
  last_notification_error: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

interface DeadLetterRow {
  id: string;
  alert_id: string | null;
  jobid: number;
  jobname: string;
  status: string;
  return_message: string | null;
  attempts: number;
  last_error: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function isStale(job: CronJobStatus): boolean {
  if (!job.active) return false;
  if (!job.last_run_started_at) return true;
  return Date.now() - new Date(job.last_run_started_at).getTime() > STALE_THRESHOLD_MS;
}

function isFailed(job: CronJobStatus): boolean {
  return job.last_run_status !== null && job.last_run_status !== "succeeded";
}

export default function CronJobsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: jobs,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["cron-job-status"],
    queryFn: () => apiRpc<CronJobStatus[]>("get_cron_job_status"),
    refetchInterval: 30_000,
  });

  const alertsQuery = useQuery({
    queryKey: ["cron-alerts"],
    queryFn: () =>
      apiRpc<CronAlertRow[]>("get_cron_alerts", { include_acknowledged: false }),
    refetchInterval: 30_000,
  });

  const deadLetterQuery = useQuery({
    queryKey: ["cron-dead-letter"],
    queryFn: () =>
      apiQuery<DeadLetterRow[]>("cron_dead_letter", (q) =>
        q.select("*").order("created_at", { ascending: false }).limit(100)
      ),
    refetchInterval: 60_000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRpc<void>("acknowledge_cron_alert", { p_alert_id: alertId }),
    onSuccess: () => {
      toast({
        title: t("admin.cronAlertAcked", "Alert acknowledged"),
      });
      queryClient.invalidateQueries({ queryKey: ["cron-alerts"] });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: err?.message,
      });
    },
  });

  const failedJobs = jobs?.filter(isFailed) || [];
  const staleJobs = jobs?.filter((j) => isStale(j) && !isFailed(j)) || [];
  const inactiveJobs = jobs?.filter((j) => !j.active) || [];
  const openAlertCount = alertsQuery.data?.length ?? 0;
  const deadLetterCount = deadLetterQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.cronJobsTitle", "Cron Job Monitor")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.cronJobsDescription", "Real-time status of scheduled background jobs")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            alertsQuery.refetch();
            deadLetterQuery.refetch();
          }}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">
            {t("admin.cronTabJobs", "Jobs")}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            {t("admin.cronTabAlerts", "Alerts")}
            {openAlertCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {openAlertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dead-letter" className="gap-2">
            {t("admin.cronTabDeadLetter", "Dead-letter")}
            {deadLetterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {deadLetterCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6 pt-6">
          {failedJobs.length > 0 && (
            <Alert variant="destructive" className="border-destructive/50">
              <XCircle className="h-4 w-4" />
              <AlertTitle>
                {t("admin.cronFailuresTitle", "{{count}} cron job(s) failed", {
                  count: failedJobs.length,
                })}
              </AlertTitle>
              <AlertDescription>
                {t(
                  "admin.cronFailuresDescription",
                  "The following jobs reported a failure on their last run. Check the return message for details."
                )}
              </AlertDescription>
            </Alert>
          )}
          {staleJobs.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                {t("admin.cronStaleTitle", "{{count}} job(s) stale", { count: staleJobs.length })}
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                {t(
                  "admin.cronStaleDescription",
                  "These active jobs have not run in the last 24 hours. Verify the scheduler is running."
                )}
              </AlertDescription>
            </Alert>
          )}
          {inactiveJobs.length > 0 && (
            <Alert className="border-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <AlertTitle>
                {t("admin.cronInactiveTitle", "{{count}} job(s) inactive", {
                  count: inactiveJobs.length,
                })}
              </AlertTitle>
              <AlertDescription>
                {t("admin.cronInactiveDescription", "These jobs are disabled and will not execute.")}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard icon={Timer} label={t("admin.cronTotalJobs", "Total Jobs")} value={jobs?.length ?? 0} tone="primary" />
            <SummaryCard icon={Activity} label={t("admin.cronActiveJobs", "Active")} value={jobs?.filter((j) => j.active).length ?? 0} tone="success" />
            <SummaryCard icon={XCircle} label={t("admin.cronFailedJobs", "Failed")} value={failedJobs.length} tone="destructive" />
            <SummaryCard icon={AlertTriangle} label={t("admin.cronStaleJobs", "Stale")} value={staleJobs.length} tone="warning" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.cronJobsTableTitle", "Job Details")}</CardTitle>
              <CardDescription>
                {t("admin.cronJobsTableDescription", "Last run status and schedule for each pg_cron job")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton columns={6} rows={4} />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("common.error", "Error")}</AlertTitle>
                  <AlertDescription>
                    {t("admin.cronLoadError", "Could not load cron job status.")}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronJobName", "Job Name")}</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronSchedule", "Schedule")}</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronStatus", "Status")}</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronLastRun", "Last Run")}</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronDuration", "Duration")}</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("admin.cronMessage", "Message")}</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {jobs?.map((job) => {
                        const stale = isStale(job);
                        const failed = isFailed(job);
                        return (
                          <tr
                            key={job.jobid}
                            className={cn(
                              "border-b transition-colors hover:bg-muted/50",
                              failed && "bg-destructive/5",
                              stale && !failed && "bg-yellow-500/5"
                            )}
                          >
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{job.jobname}</span>
                                {!job.active && <Badge variant="secondary">{t("admin.cronInactiveBadge", "Inactive")}</Badge>}
                                {failed && <Badge variant="destructive">{t("admin.cronFailedBadge", "Failed")}</Badge>}
                                {stale && !failed && (
                                  <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
                                    {t("admin.cronStaleBadge", "Stale")}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle font-mono text-xs text-muted-foreground">{job.schedule}</td>
                            <td className="p-4 align-middle">
                              {job.last_run_status === "succeeded" ? (
                                <div className="flex items-center gap-1.5 text-success">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>{t("admin.cronSucceeded", "Succeeded")}</span>
                                </div>
                              ) : job.last_run_status ? (
                                <div className="flex items-center gap-1.5 text-destructive">
                                  <XCircle className="h-4 w-4" />
                                  <span>{job.last_run_status}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{t("admin.cronNeverRun", "Never run")}</span>
                              )}
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">
                              {job.last_run_started_at ? formatDateTime(job.last_run_started_at, "PPp") : "—"}
                            </td>
                            <td className="p-4 align-middle text-muted-foreground">
                              {job.last_run_duration_ms !== null ? `${(job.last_run_duration_ms / 1000).toFixed(2)}s` : "—"}
                            </td>
                            <td className="p-4 align-middle max-w-xs truncate text-muted-foreground">
                              {job.last_run_return_message || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                {t("admin.cronAlertsTitle", "Open Alerts")}
              </CardTitle>
              <CardDescription>
                {t(
                  "admin.cronAlertsDescription",
                  "Cron job failures that have not been acknowledged. Admins receive an in-app notification within 5 minutes."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsQuery.isLoading ? (
                <TableSkeleton columns={5} rows={3} />
              ) : (alertsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("admin.cronAlertsEmpty", "No open alerts. 🎉")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronJobName", "Job")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronStatus", "Status")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronMessage", "Message")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronAttempts", "Attempts")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronCreatedAt", "Created")}</th>
                        <th className="h-10 px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {alertsQuery.data?.map((a) => (
                        <tr key={a.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{a.jobname}</td>
                          <td className="p-3">
                            <Badge variant="destructive">{a.status}</Badge>
                          </td>
                          <td className="p-3 max-w-md truncate text-muted-foreground">
                            {a.return_message || "—"}
                          </td>
                          <td className="p-3 text-muted-foreground">{a.notification_attempts}</td>
                          <td className="p-3 text-muted-foreground">{formatDateTime(a.created_at, "PPp")}</td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeMutation.mutate(a.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              {t("admin.cronAck", "Acknowledge")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dead-letter" className="space-y-4 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="h-5 w-5" />
                {t("admin.cronDeadLetterTitle", "Dead-letter Queue")}
              </CardTitle>
              <CardDescription>
                {t(
                  "admin.cronDeadLetterDescription",
                  "Alerts that could not be delivered after 3 attempts. Investigate manually."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deadLetterQuery.isLoading ? (
                <TableSkeleton columns={4} rows={3} />
              ) : (deadLetterQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("admin.cronDeadLetterEmpty", "Dead-letter queue is empty.")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronJobName", "Job")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronStatus", "Status")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronLastError", "Last Error")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronAttempts", "Attempts")}</th>
                        <th className="h-10 px-3 text-left font-medium text-muted-foreground">{t("admin.cronCreatedAt", "Created")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deadLetterQuery.data?.map((d) => (
                        <tr key={d.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{d.jobname}</td>
                          <td className="p-3">
                            <Badge variant="destructive">{d.status}</Badge>
                          </td>
                          <td className="p-3 max-w-md truncate text-muted-foreground">{d.last_error || "—"}</td>
                          <td className="p-3 text-muted-foreground">{d.attempts}</td>
                          <td className="p-3 text-muted-foreground">{formatDateTime(d.created_at, "PPp")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-yellow-500"
          : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", toneClass)} />
          <span className="text-2xl font-bold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}
