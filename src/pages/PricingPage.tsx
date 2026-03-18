import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, GraduationCap, Users, Calendar, Tag, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format-utils";
import { calculateTax } from "@/lib/tax-utils";
import { useToast } from "@/hooks/use-toast";

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    type: "percentage" | "fixed_amount";
    value: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: classes, isLoading } = useQuery({
    queryKey: ["pricing-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id, name, description, price, currency, max_students, start_date, end_date, is_active,
          levels (name_nl, name_en, name_ar)
        `)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's existing enrollments
  const { data: myEnrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("class_id, status")
        .eq("student_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async ({ classId, isFree }: { classId: string; isFree: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("class_enrollments").insert({
        class_id: classId,
        student_id: user.id,
        status: isFree ? "enrolled" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: (_, { isFree }) => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      toast({
        title: isFree
          ? t("pricing.enrollmentSuccess", "Inschrijving gelukt!")
          : t("pricing.enrollmentPending", "Aanvraag ingediend"),
        description: isFree
          ? t("pricing.enrollmentSuccessDesc", "Je hebt nu toegang tot deze klas.")
          : t("pricing.enrollmentPendingDesc", "Een beheerder zal je aanvraag beoordelen."),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("pricing.enrollmentError", "Inschrijving mislukt. Probeer het opnieuw."),
      });
    },
  });

  const getLevelName = (levels: any) => {
    if (!levels) return "";
    const lang = i18n.language;
    return lang === "ar" ? levels.name_ar : lang === "en" ? levels.name_en : levels.name_nl;
  };

  const locale = i18n.language === "ar" ? "ar-SA" : i18n.language === "en" ? "en-US" : "nl-NL";

  const getDiscountedPrice = (price: number | null) => {
    if (!price || !appliedDiscount) return price;
    if (appliedDiscount.type === "percentage") {
      return Math.max(0, price - (price * appliedDiscount.value) / 100);
    }
    return Math.max(0, price - appliedDiscount.value);
  };

  const getEnrollmentStatus = (classId: string) => {
    return myEnrollments?.find((e) => e.class_id === classId)?.status || null;
  };

  const handleEnroll = (classId: string, isFree: boolean) => {
    if (!user) {
      navigate("/register");
      return;
    }
    enrollMutation.mutate({ classId, isFree });
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidating(true);
    setDiscountError(null);

    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setDiscountError(t("pricing.invalidCode", "Invalid discount code"));
        setAppliedDiscount(null);
        return;
      }

      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = data.valid_until ? new Date(data.valid_until) : null;

      if (now < validFrom || (validUntil && now > validUntil)) {
        setDiscountError(t("pricing.invalidCode", "Invalid discount code"));
        setAppliedDiscount(null);
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        setDiscountError(t("pricing.invalidCode", "Invalid discount code"));
        setAppliedDiscount(null);
        return;
      }

      setAppliedDiscount({
        code: data.code,
        type: data.discount_type as "percentage" | "fixed_amount",
        value: data.discount_value,
      });
      setDiscountError(null);
    } catch {
      setDiscountError(t("common.error"));
      setAppliedDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <div className="container py-12">
        <div className="mx-auto max-w-3xl text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {t("pricing.title", "Prijzen & Cursussen")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("pricing.subtitle", "Kies de cursus die bij je past en begin vandaag nog met Arabisch leren.")}
          </p>
        </div>

        {/* Discount code input */}
        <div className="mx-auto max-w-md mb-8">
          <div className="flex gap-2">
            <Input
              placeholder={t("pricing.discountCode", "Kortingscode")}
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
            />
            <Button
              variant="outline"
              onClick={handleApplyDiscount}
              disabled={isValidating || !discountCode.trim()}
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4 mr-1" />}
              {t("pricing.applyCode", "Toepassen")}
            </Button>
          </div>
          {discountError && (
            <p className="text-sm text-destructive mt-2 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> {discountError}
            </p>
          )}
          {appliedDiscount && (
            <p className="text-sm text-success mt-2 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("pricing.discountApplied", "Korting toegepast!")}{" "}
              {appliedDiscount.type === "percentage"
                ? `${appliedDiscount.value}%`
                : formatCurrency(appliedDiscount.value, "EUR", locale)}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : classes && classes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => {
              const originalPrice = cls.price;
              const discountedPrice = getDiscountedPrice(originalPrice);
              const hasDiscount = appliedDiscount && originalPrice && discountedPrice !== originalPrice;
              const taxInfo = originalPrice ? calculateTax(originalPrice, "NL") : null;
              const isFree = !originalPrice || originalPrice === 0;
              const enrollmentStatus = getEnrollmentStatus(cls.id);

              return (
                <Card key={cls.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary">
                        {getLevelName(cls.levels)}
                      </Badge>
                      {enrollmentStatus && (
                        <Badge variant={enrollmentStatus === "enrolled" ? "default" : "outline"}>
                          {enrollmentStatus === "enrolled"
                            ? t("pricing.enrolled", "Ingeschreven")
                            : t("pricing.pendingApproval", "Wacht op goedkeuring")}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                    {cls.description && (
                      <CardDescription>{cls.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t("pricing.maxStudents", "Max {{count}} studenten", { count: cls.max_students || 50 })}
                      </div>
                      {cls.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(cls.start_date).toLocaleDateString(locale)}
                        </div>
                      )}
                    </div>
                    <div>
                      {hasDiscount ? (
                        <div className="mb-3">
                          <p className="text-lg line-through text-muted-foreground">
                            {formatCurrency(originalPrice!, cls.currency || "EUR", locale)}
                          </p>
                          <p className="text-2xl font-bold text-success">
                            {formatCurrency(discountedPrice!, cls.currency || "EUR", locale)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold mb-3">
                          {originalPrice
                            ? formatCurrency(originalPrice, cls.currency || "EUR", locale)
                            : t("pricing.free", "Gratis")}
                        </p>
                      )}
                      {taxInfo && originalPrice ? (
                        <p className="text-xs text-muted-foreground mb-2">
                          {t("pricing.inclVat", "Incl. {{rate}}% BTW", { rate: taxInfo.vatRate * 100 })}
                        </p>
                      ) : null}
                      <Button
                        className="w-full"
                        onClick={() => handleEnroll(cls.id, isFree)}
                        disabled={!!enrollmentStatus || enrollMutation.isPending}
                      >
                        {enrollMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <GraduationCap className="h-4 w-4 mr-2" />
                        )}
                        {enrollmentStatus
                          ? enrollmentStatus === "enrolled"
                            ? t("pricing.alreadyEnrolled", "Al ingeschreven")
                            : t("pricing.pendingApproval", "Wacht op goedkeuring")
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
            <p className="text-muted-foreground">
              {t("pricing.noClasses", "Er zijn momenteel geen actieve cursussen.")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
