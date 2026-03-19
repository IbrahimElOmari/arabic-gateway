import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Search, Download, Loader2, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/date-utils";
import { exportToCSV } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  succeeded: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 25;

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Fetch payments with server-side pagination
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["admin-payments", statusFilter, methodFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (methodFilter !== "all") {
        query = query.eq("payment_method", methodFilter as any);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data.map((p) => p.user_id))];
      let profiles: { user_id: string; full_name: string; email: string }[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        profiles = profileData || [];
      }

      const profileMap = new Map<string, { user_id: string; full_name: string; email: string }>(
        profiles.map((p) => [p.user_id, p])
      );
      const payments = data.map((payment) => ({
        ...payment,
        profile: profileMap.get(payment.user_id) || null,
      }));

      return { payments, totalCount: count ?? 0 };
    },
  });

  const payments = paymentsData?.payments;
  const totalPages = paymentsData ? Math.ceil(paymentsData.totalCount / PAGE_SIZE) : 0;

  // Compute stats from current page (for display — stats are approximate)
  const { data: statsData } = useQuery({
    queryKey: ["admin-payments-stats"],
    queryFn: async () => {
      const data = await apiQuery<any[]>("payments", (q) => q.select("status, amount"));
      return {
        total: data.length,
        succeeded: data.filter((p) => p.status === "succeeded").length,
        pending: data.filter((p) => p.status === "pending").length,
        revenue: data
          .filter((p) => p.status === "succeeded")
          .reduce((sum, p) => sum + p.amount, 0),
      };
    },
  });

  const stats = statsData || { total: 0, succeeded: 0, pending: 0, revenue: 0 };

  // Client-side search filter on current page
  const filtered = useMemo(() => {
    if (!payments) return [];
    if (!debouncedSearch) return payments;
    return payments.filter((p) => {
      return (
        p.profile?.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.profile?.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.stripe_payment_intent_id?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    });
  }, [payments, debouncedSearch]);

  const handleExport = useCallback(() => {
    if (!filtered.length) return;
    exportToCSV(
      filtered.map((p) => ({
        date: formatDate(p.created_at),
        student: p.profile?.full_name || "-",
        email: p.profile?.email || "-",
        amount: `${p.currency} ${(p.amount / 100).toFixed(2)}`,
        method: p.payment_method,
        status: p.status,
        stripe_id: p.stripe_payment_intent_id || "-",
        notes: p.notes || "",
      })),
      `payments-${new Date().toISOString().slice(0, 10)}`
    );
  }, [filtered]);

  const formatAmount = (amount: number, currency: string) => {
    return formatCurrency(amount / 100, currency || "EUR");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.payments", "Payments")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.paymentsDescription", "Manage payments and subscriptions")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!filtered.length}>
          <Download className="h-4 w-4 mr-2" />
          {t("common.exportCSV", "Export CSV")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalPayments", "Total Payments")}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.completedPayments", "Completed")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.succeeded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.pendingPayments", "Pending")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalRevenue", "Total Revenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.revenue, "EUR")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.paymentHistory", "Payment History")}</CardTitle>
          <CardDescription>{t("admin.paymentHistoryDesc", "View and manage all payment transactions")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.searchPayments", "Search by name, email or Stripe ID...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("admin.filterStatus", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="pending">{t("admin.statusPending", "Pending")}</SelectItem>
                <SelectItem value="succeeded">{t("admin.statusSucceeded", "Succeeded")}</SelectItem>
                <SelectItem value="failed">{t("admin.statusFailed", "Failed")}</SelectItem>
                <SelectItem value="refunded">{t("admin.statusRefunded", "Refunded")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("admin.filterMethod", "Method")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="manual">{t("admin.manual", "Manual")}</SelectItem>
                <SelectItem value="bank_transfer">{t("admin.bankTransfer", "Bank Transfer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">
                {t("admin.noPayments", "No payments found")}
              </h3>
              <p className="text-muted-foreground">
                {paymentsData?.totalCount === 0
                  ? t("admin.noPaymentsYet", "No payment transactions have been recorded yet.")
                  : t("admin.noPaymentsFilter", "Try adjusting your filters.")}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.date", "Date")}</TableHead>
                      <TableHead>{t("admin.student", "Student")}</TableHead>
                      <TableHead>{t("admin.amount", "Amount")}</TableHead>
                      <TableHead>{t("admin.method", "Method")}</TableHead>
                      <TableHead>{t("admin.status", "Status")}</TableHead>
                      <TableHead>{t("admin.notes", "Notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{payment.profile?.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{payment.profile?.email || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.payment_method === "bank_transfer"
                              ? t("admin.bankTransfer", "Bank Transfer")
                              : payment.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[payment.status] || ""}`}>
                            {t(`admin.status${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}`, payment.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t("common.previous", "Previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t("common.pageOf", "Page {{current}} of {{total}}", { current: page + 1, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t("common.next", "Next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
