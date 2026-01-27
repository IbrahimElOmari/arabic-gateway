import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Percent, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  class_id: string | null;
  is_active: boolean;
  created_at: string;
}

export default function DiscountCodesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    max_uses: "",
    class_id: "",
    is_active: true,
  });

  // Fetch discount codes
  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin-discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiscountCode[];
    },
  });

  // Create discount code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("discount_codes").insert({
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        class_id: data.class_id || null,
        is_active: data.is_active,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      toast({
        title: t("admin.discountCreated", "Discount Code Created"),
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: error.message.includes("duplicate")
          ? t("admin.duplicateCode", "This code already exists")
          : t("admin.createDiscountError", "Failed to create discount code."),
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
    },
  });

  // Delete discount code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      toast({
        title: t("admin.discountDeleted", "Discount Code Deleted"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.deleteDiscountError", "Failed to delete discount code."),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: "",
      max_uses: "",
      class_id: "",
      is_active: true,
    });
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: t("admin.codeCopied", "Code copied to clipboard"),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCodeMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("admin.discountCodes", "Discount Codes")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.discountCodesDescription", "Create and manage promotional codes")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.createDiscount", "Create Discount")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.createNewDiscount", "Create New Discount Code")}</DialogTitle>
              <DialogDescription>
                {t("admin.createDiscountDescription", "Set up a promotional discount code.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t("admin.discountCode", "Discount Code")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="SAVE20"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    {t("admin.generate", "Generate")}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">{t("admin.discountType", "Discount Type")}</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, discount_type: v as "percentage" | "fixed_amount" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("admin.percentage", "Percentage (%)")}</SelectItem>
                      <SelectItem value="fixed_amount">{t("admin.fixedAmount", "Fixed Amount (€)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.discount_type === "percentage"
                      ? t("admin.percentageValue", "Percentage")
                      : t("admin.amountValue", "Amount (€)")}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step={formData.discount_type === "percentage" ? "1" : "0.01"}
                    min={0}
                    max={formData.discount_type === "percentage" ? 100 : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">{t("admin.validFrom", "Valid From")}</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">{t("admin.validUntil", "Valid Until")}</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_uses">{t("admin.maxUses", "Max Uses (optional)")}</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min={1}
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder={t("admin.unlimited", "Unlimited")}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">{t("admin.activeImmediately", "Active immediately")}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={createCodeMutation.isPending}>
                  {createCodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("common.create", "Create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Discount Codes Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.code", "Code")}</TableHead>
              <TableHead>{t("admin.discount", "Discount")}</TableHead>
              <TableHead>{t("admin.usage", "Usage")}</TableHead>
              <TableHead>{t("admin.validity", "Validity")}</TableHead>
              <TableHead>{t("admin.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : codes && codes.length > 0 ? (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-primary">{code.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(code.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {code.discount_type === "percentage" ? (
                        <>
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <span>{code.discount_value}%</span>
                        </>
                      ) : (
                        <span>€{code.discount_value.toFixed(2)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.current_uses}/{code.max_uses || "∞"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(code.valid_from).toLocaleDateString()}
                    {code.valid_until && ` - ${new Date(code.valid_until).toLocaleDateString()}`}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: code.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCodeMutation.mutate(code.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("admin.noDiscountCodes", "No discount codes found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
