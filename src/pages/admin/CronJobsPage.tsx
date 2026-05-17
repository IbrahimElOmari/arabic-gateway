import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiRpc } from "@/lib/supabase-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function isStale(job: CronJobStatus): boolean {
  if (!job.active) return false;
  if (!job.last_run_started_at) return true;
  const lastRun = new Date(job.last_run_started_at).getTime();
  return Date.now() - lastRun > STALE_THRESHOLD_MS;
}

function isFailed(job: CronJobStatus): boolean {
  return job.last_run_status !== null && job.last_run_status !== "succeeded";
}

export default function CronJobsPage() {
  const { t } = useTranslation();

  const {
    data: jobs,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["cron-job-status"],
    queryFn: async () => {
      const result = await apiRpc<CronJobStatus[]>("get_cron_job_status");
      return result;
    },
    refetchInterval: 30_000, // refresh every 30s
  });

  const failedJobs = jobs?.filter(isFailed) || [];
  const staleJobs = jobs?.filter((j) => isStale(j) && !isFailed(j)) || [];
  const inactiveJobs = jobs?.filter((j) => !j.active) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
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
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Failure Alert */}
      {failedJobs.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="h-4 w-4" />
          <AlertTitle>
            {t("admin.cronFailuresTitle", "{{count}} cron job(s) failed", { count: failedJobs.length })}
          </AlertTitle>
          <AlertDescription>
            {t(
              "admin.cronFailuresDescription",
              "The following jobs reported a failure on their last run. Check the return message for details."
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stale Alert */}
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

      {/* Inactive Alert */}
      {inactiveJobs.length > 0 && (
        <Alert className="border-muted">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <AlertTitle>
            {t("admin.cronInactiveTitle", "{{count}} job(s) inactive", { count: inactiveJobs.length })}
          </AlertTitle>
          <AlertDescription>
            {t("admin.cronInactiveDescription", "These jobs are disabled and will not execute.")}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.cronTotalJobs", "Total Jobs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{jobs?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.cronActiveJobs", "Active")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">
                {jobs?.filter((j) => j.active).length ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.cronFailedJobs", "Failed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{failedJobs.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.cronStaleJobs", "Stale")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{staleJobs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
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
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronJobName", "Job Name")}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronSchedule", "Schedule")}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronStatus", "Status")}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronLastRun", "Last Run")}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronDuration", "Duration")}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t("admin.cronMessage", "Message")}
                    </th>
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
                            {!job.active && (
                              <Badge variant="secondary">
                                {t("admin.cronInactiveBadge", "Inactive")}
                              </Badge>
                            )}
                            {failed && (
                              <Badge variant="destructive">
                                {t("admin.cronFailedBadge", "Failed")}
                              </Badge>
                            )}
                            {stale && !failed && (
                              <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
                                {t("admin.cronStaleBadge", "Stale")}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                          {job.schedule}
                        </td>
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
                            <span className="text-muted-foreground">
                              {t("admin.cronNeverRun", "Never run")}
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground">
                          {job.last_run_started_at
                            ? formatDateTime(job.last_run_started_at, "PPp")
                            : "—"}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground">
                          {job.last_run_duration_ms !== null
                            ? `${(job.last_run_duration_ms / 1000).toFixed(2)}s`
                            : "—"}
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
    </div>
  );
}

// Inline cn to avoid circular import issues with the page module
function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}
