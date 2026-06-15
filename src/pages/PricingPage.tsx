import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, GraduationCap, Users, Calendar, Tag, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format-utils";
import { calculateTax } from "@/lib/tax-utils";
import { useToast } from "@/hooks/use-toast";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type BillingCycle = "monthly" | "yearly";

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: "percentage" | "fixed_amount"; value: number; class_id: string | null } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["pricing-classes"],
    queryFn: () => apiQuery<any[]>("classes", (q) =>
      q.select(`id, name, description, price, price_monthly, price_yearly, paddle_price_id_monthly, paddle_price_id_yearly, currency, max_students, start_date, end_date, is_active, levels (name_nl, name_en, name_ar)`)
        .eq("is_active", true).order("price", { ascending: true })
    ),
  });

  const { data: extras } = useQuery({
    queryKey: ["pricing-extras"],
    queryFn: () => apiQuery<any[]>("extra_products", (q) =>
      q.select("*").eq("is_active", true).order("created_at", { ascending: false })
    ),
  });

  const { data: myEnrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: () => apiQuery<any[]>("class_enrollments", (q) =>
      q.select("class_id, status").eq("student_id", user!.id)
    ),
    enabled: !!user,
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ classId }: { classId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const existing = await apiQuery<any>("class_enrollments", (q) =>
        q.select("id, status").eq("class_id", classId).eq("student_id", user.id).maybeSingle()
      );
      if (existing) throw new Error(existing.status === "enrolled" ? "already_enrolled" : "already_pending");
      await apiMutate("class_enrollments", (q) =>
        q.insert({ class_id: classId, student_id: user.id, status: "enrolled" })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      toast({ title: t("pricing.enrollmentSuccess", "Ingeschreven!") });
    },
    onError: (e: Error) => {
      if (e.message === "already_enrolled") toast({ title: t("pricing.alreadyEnrolled", "Al ingeschreven") });
      else toast({ variant: "destructive", title: t("common.error", "Fout") });
    },
  });

  const getLevelName = (levels: any) => {
    if (!levels) return "";
    const lang = i18n.language;
    return lang === "ar" ? levels.name_ar : lang === "en" ? levels.name_en : levels.name_nl;
  };
  const locale = i18n.language === "ar" ? "ar-SA" : i18n.language === "en" ? "en-US" : "nl-NL";

  const getEnrollmentStatus = (classId: string) => myEnrollments?.find((e) => e.class_id === classId)?.status || null;

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidating(true);
    setDiscountError(null);
    try {
      const data = await apiQuery<any>("discount_codes", (q) =>
        q.select("*").eq("code", discountCode.toUpperCase()).eq("is_active", true).maybeSingle()
      );
      if (!data) { setDiscountError(t("pricing.unknownCode", "Onbekende code")); setAppliedDiscount(null); return; }
      if (data.valid_until && new Date(data.valid_until) <= new Date()) { setDiscountError(t("pricing.expiredCode", "Code verlopen")); setAppliedDiscount(null); return; }
      if (data.valid_from && new Date(data.valid_from) > new Date()) { setDiscountError(t("pricing.notYetValidCode", "Nog niet geldig")); setAppliedDiscount(null); return; }
      if (data.max_uses && data.current_uses >= data.max_uses) { setDiscountError(t("pricing.codeMaxUsed", "Code max gebruikt")); setAppliedDiscount(null); return; }
      setAppliedDiscount({ code: data.code, type: data.discount_type, value: Number(data.discount_value), class_id: data.class_id });
    } catch { setDiscountError(t("common.error", "Fout")); setAppliedDiscount(null); }
    finally { setIsValidating(false); }
  };

  const getDiscountForClass = (classId: string) => {
    if (!appliedDiscount) return null;
    if (appliedDiscount.class_id && appliedDiscount.class_id !== classId) return null;
    return appliedDiscount;
  };

  const getDiscountedPrice = (price: number | null, classId: string) => {
    const d = getDiscountForClass(classId);
    if (!price || !d) return price;
    if (d.type === "percentage") return Math.max(0, price - (price * d.value) / 100);
    return Math.max(0, price - d.value);
  };

  const handleSubscribe = (cls: any) => {
    if (!user) { navigate("/register"); return; }
    const priceId = cycle === "monthly" ? cls.paddle_price_id_monthly : cls.paddle_price_id_yearly;
    if (!priceId) {
      // Fallback: legacy enrollment flow
      enrollMutation.mutate({ classId: cls.id });
      return;
    }
    const d = getDiscountForClass(cls.id);
    openCheckout({
      priceId,
      customerEmail: profile?.email || user.email,
      customData: { userId: user.id, classId: cls.id },
      discountCode: d?.code,
    });
  };

  const handleBuyExtra = (extra: any) => {
    if (!user) { navigate("/register"); return; }
    if (!extra.paddle_price_id) {
      toast({ variant: "destructive", title: "Niet beschikbaar", description: "Product nog niet gekoppeld aan Paddle." });
      return;
    }
    openCheckout({
      priceId: extra.paddle_price_id,
      customerEmail: profile?.email || user.email,
      customData: { userId: user.id, extraId: extra.id },
    });
  };

  return (
    <>
      <PaymentTestModeBanner />
      <div className="container py-12 space-y-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">{t("pricing.title", "Prijzen & Cursussen")}</h1>
          <p className="text-muted-foreground text-lg">{t("pricing.subtitle", "Kies de cursus die bij je past.")}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Tabs value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
            <TabsList>
              <TabsTrigger value="monthly">{t("pricing.monthly", "Maandelijks")}</TabsTrigger>
              <TabsTrigger value="yearly">{t("pricing.yearly", "Jaarlijks")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full max-w-md">
            <div className="flex gap-2">
              <Input placeholder={t("pricing.discountCode", "Kortingscode")} value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()} />
              <Button variant="outline" onClick={handleApplyDiscount} disabled={isValidating || !discountCode.trim()}>
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4 mr-1" />}
                {t("pricing.applyCode", "Toepassen")}
              </Button>
            </div>
            {discountError && <p className="text-sm text-destructive mt-2 flex items-center gap-1"><XCircle className="h-3 w-3" /> {discountError}</p>}
            {appliedDiscount && (
              <p className="text-sm text-success mt-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t("pricing.discountApplied", "Korting toegepast")}: {appliedDiscount.type === "percentage" ? `${appliedDiscount.value}%` : formatCurrency(appliedDiscount.value, "EUR", locale)}
                {appliedDiscount.class_id ? " (alleen specifieke klas)" : ""}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : classes && classes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => {
              const basePrice = cycle === "monthly"
                ? (cls.price_monthly ?? cls.price)
                : (cls.price_yearly ?? (cls.price_monthly ? cls.price_monthly * 12 : cls.price));
              const discounted = getDiscountedPrice(basePrice, cls.id);
              const hasDiscount = !!getDiscountForClass(cls.id) && basePrice && discounted !== basePrice;
              const taxInfo = basePrice ? calculateTax(basePrice, "NL") : null;
              const enrollmentStatus = getEnrollmentStatus(cls.id);
              const isPaddleReady = cycle === "monthly" ? !!cls.paddle_price_id_monthly : !!cls.paddle_price_id_yearly;

              return (
                <Card key={cls.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary">{getLevelName(cls.levels)}</Badge>
                      {enrollmentStatus && (
                        <Badge variant={enrollmentStatus === "enrolled" ? "default" : "outline"}>
                          {enrollmentStatus === "enrolled" ? t("pricing.enrolled", "Ingeschreven") : t("pricing.pendingApproval", "Wacht op goedkeuring")}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                    {cls.description && <CardDescription>{cls.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Users className="h-4 w-4" />{t("pricing.maxStudents", "Max {{count}} studenten", { count: cls.max_students || 50 })}</div>
                      {cls.start_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(cls.start_date).toLocaleDateString(locale)}</div>}
                    </div>
                    <div>
                      {hasDiscount ? (
                        <div className="mb-3">
                          <p className="text-lg line-through text-muted-foreground">{formatCurrency(basePrice!, cls.currency || "EUR", locale)}</p>
                          <p className="text-2xl font-bold text-success">{formatCurrency(discounted!, cls.currency || "EUR", locale)}<span className="text-sm font-normal text-muted-foreground"> / {cycle === "monthly" ? t("pricing.month", "mnd") : t("pricing.year", "jaar")}</span></p>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold mb-3">
                          {basePrice ? formatCurrency(basePrice, cls.currency || "EUR", locale) : t("pricing.free", "Gratis")}
                          {basePrice ? <span className="text-sm font-normal text-muted-foreground"> / {cycle === "monthly" ? t("pricing.month", "mnd") : t("pricing.year", "jaar")}</span> : null}
                        </p>
                      )}
                      {taxInfo && basePrice ? <p className="text-xs text-muted-foreground mb-2">{t("pricing.inclVat", "Incl. {{rate}}% BTW", { rate: taxInfo.vatRate * 100 })}</p> : null}
                      <Button className="w-full" onClick={() => handleSubscribe(cls)} disabled={enrollmentStatus === "enrolled" || checkoutLoading || enrollMutation.isPending}>
                        {(checkoutLoading || enrollMutation.isPending) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GraduationCap className="h-4 w-4 mr-2" />}
                        {enrollmentStatus === "enrolled"
                          ? t("pricing.alreadyEnrolled", "Al ingeschreven")
                          : isPaddleReady
                            ? t("pricing.subscribe", "Abonneer")
                            : t("pricing.enroll", "Inschrijven")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("pricing.noClasses", "Geen actieve cursussen.")}</p>
          </div>
        )}

        {extras && extras.length > 0 && (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">{t("pricing.extras", "Extra materialen")}</h2>
              <p className="text-muted-foreground">{t("pricing.extrasSubtitle", "Eenmalige aankopen: literatuur en meer.")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {extras.map((ex: any) => (
                <Card key={ex.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-4 w-4" />{ex.name}</CardTitle>
                    {ex.description && <CardDescription>{ex.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <p className="text-2xl font-bold">{formatCurrency(Number(ex.price), ex.currency || "EUR", locale)}</p>
                    <Button onClick={() => handleBuyExtra(ex)} disabled={checkoutLoading}>
                      {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {t("pricing.buy", "Koop nu")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
