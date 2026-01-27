import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function PaymentsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.payments", "Payments")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.paymentsDescription", "Manage payments and subscriptions")}
        </p>
      </div>

      {/* Stripe Not Configured Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("admin.stripeIntegration", "Stripe Integration")}
          </CardTitle>
          <CardDescription>
            {t("admin.stripeNotConfiguredDescription", "Connect your Stripe account to accept payments")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-yellow-100 p-6 dark:bg-yellow-900/20 mb-6">
              <CreditCard className="h-12 w-12 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("admin.stripeComingSoon", "Payments Coming Soon")}
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t(
                "admin.stripeSetupDescription",
                "Once you provide your Stripe API key, you'll be able to accept online payments, manage subscriptions, and process installment plans."
              )}
            </p>
            <div className="grid gap-4 text-left max-w-md w-full">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t("admin.oneTimePayments", "One-time Payments")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.oneTimePaymentsDescription", "Accept single payments for class enrollments")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t("admin.subscriptions", "Subscriptions")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.subscriptionsDescription", "Recurring billing for ongoing access")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t("admin.installmentPlans", "Installment Plans")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.installmentPlansDescription", "Split payments over multiple months")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
