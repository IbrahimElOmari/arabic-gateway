import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useToast } from "@/hooks/use-toast";

export interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  customData?: Record<string, string>;
  discountCode?: string;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const openCheckout = async (options: CheckoutOptions) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        discountCode: options.discountCode,
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl || `${window.location.origin}/billing?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Checkout fout",
        description: e?.message || "Kon checkout niet openen",
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
