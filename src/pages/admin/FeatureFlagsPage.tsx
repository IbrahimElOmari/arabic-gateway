import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlagRow {
  key: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  enabled_for_roles: string[];
  updated_at: string;
}

const ROLES = ["admin", "teacher", "student"] as const;

export default function FeatureFlagsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: flags, isLoading } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: () =>
      apiQuery<FeatureFlagRow[]>("feature_flags", (q) =>
        q.select("*").order("key", { ascending: true })
      ),
  });

  const update = async (key: string, patch: Partial<FeatureFlagRow>) => {
    setSaving(key);
    try {
      await apiMutate("feature_flags", (q) => q.update(patch).eq("key", key));
      await qc.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast({ title: t("admin.featureFlags.saved", "Flag updated") });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const toggleRole = (flag: FeatureFlagRow, role: string) => {
    const next = flag.enabled_for_roles.includes(role)
      ? flag.enabled_for_roles.filter((r) => r !== role)
      : [...flag.enabled_for_roles, role];
    void update(flag.key, { enabled_for_roles: next });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t("admin.featureFlags.title", "Feature Flags")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "admin.featureFlags.description",
            "Toggle features without redeploying. Changes propagate in realtime."
          )}
        </p>
      </div>

      <div className="grid gap-4">
        {flags?.map((flag) => (
          <Card key={flag.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    {flag.key}
                    {flag.enabled && (
                      <Badge variant="default">
                        {t("admin.featureFlags.on", "ON")}
                      </Badge>
                    )}
                  </CardTitle>
                  {flag.description && (
                    <CardDescription>{flag.description}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saving === flag.key && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(v) => update(flag.key, { enabled: v })}
                    aria-label={t("admin.featureFlags.toggle", "Toggle flag")}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">
                  {t("admin.featureFlags.rollout", "Rollout percentage")}:{" "}
                  {flag.rollout_percentage}%
                </Label>
                <Slider
                  value={[flag.rollout_percentage]}
                  onValueChange={([v]) =>
                    update(flag.key, { rollout_percentage: v ?? 0 })
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">
                  {t("admin.featureFlags.roles", "Enabled for roles")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => {
                    const active = flag.enabled_for_roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(flag, role)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {flags?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("admin.featureFlags.empty", "No feature flags yet.")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
