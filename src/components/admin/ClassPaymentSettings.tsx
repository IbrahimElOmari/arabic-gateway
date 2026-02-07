import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, CreditCard, Percent, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ClassPaymentSettingsProps {
  classId: string;
  className: string;
  currentPrice: number | null;
  currency: string;
}

export function ClassPaymentSettings({ classId, className, currentPrice, currency }: ClassPaymentSettingsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [priceForm, setPriceForm] = useState({
    price: currentPrice?.toString() || "",
    currency: currency || "EUR",
  });
  const [discountForm, setDiscountForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: "",
    valid_until: "",
    max_uses: "",
    is_active: true,
  });

  // Fetch discounts for this class
  const { data: discounts, isLoading } = useQuery({
    queryKey: ["class-discounts", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch installment plans
  const { data: installmentPlans } = useQuery({
    queryKey: ["installment-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_plans")
        .select("*")
        .eq("is_active", true)
        .order("total_installments");
      if (error) throw error;
      return data;
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (data: typeof priceForm) => {
      const { error } = await supabase
        .from("classes")
        .update({
          price: data.price ? parseFloat(data.price) : null,
          currency: data.currency,
        })
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      setShowPriceDialog(false);
      toast({ title: t("admin.priceUpdated", "Price Updated") });
    },
  });

  const createDiscountMutation = useMutation({
    mutationFn: async (data: typeof discountForm) => {
      const { error } = await supabase.from("discount_codes").insert([{
        code: data.code.toUpperCase(),
        class_id: classId,
        discount_type: data.discount_type as "percentage" | "fixed_amount",
        discount_value: parseFloat(data.discount_value),
        valid_until: data.valid_until || null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        is_active: data.is_active,
        created_by: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-discounts", classId] });
      setShowDiscountDialog(false);
      resetDiscountForm();
      toast({ title: t("admin.discountCreated", "Discount Code Created") });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: t("common.error"),
        description: error.message?.includes("duplicate") 
          ? t("admin.codeExists", "This code already exists")
          : undefined
      });
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-discounts", classId] });
      toast({ title: t("admin.discountDeleted", "Discount Deleted") });
    },
  });

  const toggleDiscountMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-discounts", classId] });
    },
  });

  const resetDiscountForm = () => {
    setDiscountForm({
      code: "",
      discount_type: "percentage" as "percentage" | "fixed_amount",
      discount_value: "",
      valid_until: "",
      max_uses: "",
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Price Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("admin.classPricing", "Class Pricing")}
          </CardTitle>
          <CardDescription>
            {t("admin.classPricingDescription", "Set the enrollment price for")} {className}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {currentPrice 
                  ? `${currency} ${currentPrice.toFixed(2)}` 
                  : t("admin.noPrice", "No price set")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("admin.currentEnrollmentPrice", "Current enrollment price")}
              </p>
            </div>
            <Button onClick={() => setShowPriceDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t("admin.editPrice", "Edit Price")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Discount Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {t("admin.discountCodes", "Discount Codes")}
              </CardTitle>
              <CardDescription>
                {t("admin.discountCodesDescription", "Create discount codes for this class")}
              </CardDescription>
            </div>
            <Button onClick={() => { resetDiscountForm(); setShowDiscountDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.addDiscount", "Add Discount")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : discounts && discounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.code", "Code")}</TableHead>
                  <TableHead>{t("admin.discount", "Discount")}</TableHead>
                  <TableHead>{t("admin.uses", "Uses")}</TableHead>
                  <TableHead>{t("admin.validUntil", "Valid Until")}</TableHead>
                  <TableHead>{t("admin.status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-bold">{discount.code}</TableCell>
                    <TableCell>
                      {discount.discount_type === "percentage" 
                        ? `${discount.discount_value}%`
                        : `€${discount.discount_value}`}
                    </TableCell>
                    <TableCell>
                      {discount.current_uses}/{discount.max_uses || "∞"}
                    </TableCell>
                    <TableCell>
                      {discount.valid_until 
                        ? new Date(discount.valid_until).toLocaleDateString()
                        : t("admin.noExpiry", "No expiry")}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={(checked) => 
                          toggleDiscountMutation.mutate({ id: discount.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDiscountMutation.mutate(discount.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {t("admin.noDiscounts", "No discount codes for this class")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installment Plans Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("admin.installmentPlans", "Installment Plans")}
          </CardTitle>
          <CardDescription>
            {t("admin.installmentPlansDescription", "Available payment plans for students")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {installmentPlans && installmentPlans.length > 0 ? (
            <div className="space-y-2">
              {installmentPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.total_installments} {t("admin.payments", "payments")} / {plan.interval_months} {t("admin.monthsInterval", "month(s)")}
                    </p>
                  </div>
                  <Badge variant="outline">{t("admin.active", "Active")}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {t("admin.noInstallmentPlans", "No installment plans configured. Configure them in Payments settings.")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Price Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.editPrice", "Edit Price")}</DialogTitle>
            <DialogDescription>
              {t("admin.editPriceDescription", "Set the enrollment price for this class")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label>{t("admin.price", "Price")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={priceForm.price}
                  onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>{t("admin.currency", "Currency")}</Label>
                <Select
                  value={priceForm.currency}
                  onValueChange={(v) => setPriceForm({ ...priceForm, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button 
              onClick={() => updatePriceMutation.mutate(priceForm)}
              disabled={updatePriceMutation.isPending}
            >
              {updatePriceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.createDiscount", "Create Discount Code")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.discountCode", "Discount Code")}</Label>
              <Input
                value={discountForm.code}
                onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("admin.discountType", "Type")}</Label>
                <Select
                  value={discountForm.discount_type}
                  onValueChange={(v: "percentage" | "fixed_amount") => 
                    setDiscountForm({ ...discountForm, discount_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("admin.percentage", "Percentage")}</SelectItem>
                    <SelectItem value="fixed_amount">{t("admin.fixedAmount", "Fixed Amount")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {discountForm.discount_type === "percentage" 
                    ? t("admin.percentageValue", "Percentage (%)")
                    : t("admin.amount", "Amount (€)")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={discountForm.discount_type === "percentage" ? 100 : undefined}
                  value={discountForm.discount_value}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                  placeholder={discountForm.discount_type === "percentage" ? "20" : "50"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("admin.validUntil", "Valid Until")}</Label>
                <Input
                  type="date"
                  value={discountForm.valid_until}
                  onChange={(e) => setDiscountForm({ ...discountForm, valid_until: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("admin.maxUses", "Max Uses")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={discountForm.max_uses}
                  onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value })}
                  placeholder={t("admin.unlimited", "Unlimited")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("admin.activeImmediately", "Active Immediately")}</Label>
              <Switch
                checked={discountForm.is_active}
                onCheckedChange={(checked) => setDiscountForm({ ...discountForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => createDiscountMutation.mutate(discountForm)}
              disabled={!discountForm.code || !discountForm.discount_value || createDiscountMutation.isPending}
            >
              {createDiscountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
