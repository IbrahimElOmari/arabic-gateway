import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaddleEnvironment } from "@/lib/paddle";

export interface Subscription {
  id: string;
  status: string;
  price_id: string | null;
  product_id: string | null;
  class_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  environment: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const env = getPaddleEnvironment();
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSub();
    if (!user) return;
    const ch = supabase
      .channel(`sub-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchSub]);

  const isActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())) ||
    (subscription.status === "canceled" &&
      subscription.current_period_end && new Date(subscription.current_period_end) > new Date())
  );

  return { subscription, isActive, loading, refetch: fetchSub };
}
