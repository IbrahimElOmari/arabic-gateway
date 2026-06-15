import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { getPaddleEnvironment } from "@/lib/paddle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Receipt, CreditCard, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format-utils";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, isActive, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (params.get("checkout") === "success") {
      toast({ title: "Betaling gelukt", description: "Je toegang wordt binnen enkele seconden geactiveerd." });
      const t = setTimeout(() => { params.delete("checkout"); setParams(params, { replace: true }); }, 200);
      return () => clearTimeout(t);
    }
  }, [params, setParams, toast]);

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-portal", {
        body: { environment: getPaddleEnvironment() },
      });
      if (error || !data?.overviewUrl) throw new Error(error?.message || "Geen portaal beschikbaar");
      window.open(data.overviewUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fout", description: e.message });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <>
      <PaymentTestModeBanner />
      <div className="container max-w-4xl py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mijn abonnement</h1>
          <p className="text-muted-foreground">Beheer je abonnement, betaalmethode en facturen.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Abonnement
              </CardTitle>
              <CardDescription>Huidige status van je toegang</CardDescription>
            </div>
            {isActive && <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Actief</Badge>}
            {!isActive && subscription && <Badge variant="outline">{subscription.status}</Badge>}
            {!subscription && !subLoading && <Badge variant="outline">Geen abonnement</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {subLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : subscription ? (
              <>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{subscription.price_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Volgende periode eindigt</p>
                    <p className="font-medium">
                      {subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
                {subscription.cancel_at_period_end && (
                  <p className="text-sm text-amber-700">Opzegging gepland — toegang tot einde van de periode.</p>
                )}
                <Button onClick={openPortal} disabled={portalLoading} variant="outline">
                  {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open klantportaal
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Je hebt nog geen actief abonnement.{" "}
                <a href="/pricing" className="underline text-primary">Bekijk de prijzen</a>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Betalingsgeschiedenis
            </CardTitle>
            <CardDescription>Recente transacties en facturen</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : payments && payments.length > 0 ? (
              <div className="divide-y border rounded-md">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(Number(p.amount), p.currency || "EUR")}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={p.status === "completed" ? "default" : "outline"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nog geen betalingen.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
