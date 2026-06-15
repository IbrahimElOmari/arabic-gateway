import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format-utils";

interface ExtraForm {
  id?: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  is_active: boolean;
}

const emptyForm: ExtraForm = { name: "", description: "", price: "", currency: "EUR", is_active: true };

export default function ExtraProductsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExtraForm>(emptyForm);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-extra-products"],
    queryFn: () => apiQuery<any[]>("extra_products", (q) => q.select("*").order("created_at", { ascending: false })),
  });

  const upsert = useMutation({
    mutationFn: async (f: ExtraForm) => {
      const payload = {
        name: f.name,
        description: f.description || null,
        price: parseFloat(f.price || "0"),
        currency: f.currency,
        is_active: f.is_active,
      };
      if (f.id) {
        await apiMutate("extra_products", (q) => q.update(payload).eq("id", f.id!));
        return f.id;
      }
      const inserted = await apiQuery<any>("extra_products", (q) => q.insert(payload).select("id").single());
      return inserted.id as string;
    },
    onSuccess: async (id, f) => {
      // Auto-sync to Paddle
      const { error } = await supabase.functions.invoke("paddle-sync-product", {
        body: {
          kind: "extra",
          id,
          environment: getPaddleEnvironment(),
          name: f.name,
          description: f.description || null,
          currency: f.currency,
          price_one_time: parseFloat(f.price || "0"),
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-extra-products"] });
      qc.invalidateQueries({ queryKey: ["pricing-extras"] });
      setOpen(false);
      setForm(emptyForm);
      if (error) toast({ variant: "destructive", title: t("common.error", "Fout"), description: error.message });
      else toast({ title: t("admin.extraSynced", "Opgeslagen & gesynchroniseerd met Paddle") });
    },
    onError: (e: any) => toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message }),
  });

  const sync = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.functions.invoke("paddle-sync-product", {
        body: {
          kind: "extra",
          id: item.id,
          environment: getPaddleEnvironment(),
          name: item.name,
          description: item.description,
          currency: item.currency,
          price_one_time: Number(item.price),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-extra-products"] });
      toast({ title: t("admin.synced", "Gesynchroniseerd") });
    },
    onError: (e: any) => toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiMutate("extra_products", (q) => q.delete().eq("id", id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-extra-products"] });
      toast({ title: t("admin.deleted", "Verwijderd") });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.extraProducts", "Extra producten")}</h1>
          <p className="text-muted-foreground">{t("admin.extraProductsDesc", "Eenmalige aankopen zoals literatuur en materialen.")}</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />{t("admin.addExtra", "Nieuw product")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />{t("admin.products", "Producten")}</CardTitle>
          <CardDescription>{t("admin.extraProductsTableDesc", "Beheer prijzen en synchroniseer met Paddle.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !items?.length ? (
            <div className="text-center py-8 text-muted-foreground">{t("admin.noExtras", "Nog geen producten.")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.name", "Naam")}</TableHead>
                  <TableHead>{t("admin.price", "Prijs")}</TableHead>
                  <TableHead>Paddle</TableHead>
                  <TableHead>{t("admin.status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions", "Acties")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.name}</div>
                      {it.description && <div className="text-xs text-muted-foreground line-clamp-1">{it.description}</div>}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(it.price), it.currency || "EUR")}</TableCell>
                    <TableCell>
                      {it.paddle_price_id ? (
                        <Badge variant="outline" className="font-mono text-xs">{it.paddle_price_id.slice(0, 14)}…</Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.notSynced", "Niet gesynced")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.is_active ? "default" : "outline"}>
                        {it.is_active ? t("admin.active", "Actief") : t("admin.inactive", "Inactief")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => sync.mutate(it)} disabled={sync.isPending} title={t("admin.syncToPaddle", "Sync naar Paddle")}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setForm({ id: it.id, name: it.name, description: it.description || "", price: String(it.price), currency: it.currency || "EUR", is_active: it.is_active }); setOpen(true); }}>
                        {t("common.edit", "Bewerken")}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("admin.confirmDelete", "Weet je het zeker?"))) remove.mutate(it.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? t("admin.editExtra", "Product bewerken") : t("admin.addExtra", "Nieuw product")}</DialogTitle>
            <DialogDescription>{t("admin.extraDialogDesc", "Wordt automatisch gesynchroniseerd met Paddle bij opslaan.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.name", "Naam")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("admin.description", "Beschrijving")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.price", "Prijs")}</Label>
                <Input type="number" step="0.01" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>{t("admin.currency", "Valuta")}</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("admin.active", "Actief")}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel", "Annuleren")}</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending || !form.name || !form.price}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("admin.saveAndSync", "Opslaan & sync")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
