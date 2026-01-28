import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  class_id: string;
  plan_type: "one_time" | "subscription" | "installment";
  installment_plan_id?: string;
  discount_code?: string;
  success_url: string;
  cancel_url: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Check if Stripe is configured
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe is not configured",
          message: "Payment processing is not available. Please contact support.",
          stripe_configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { class_id, plan_type, installment_plan_id, discount_code, success_url, cancel_url } = body;

    // Validate required fields
    if (!class_id || !plan_type || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch class details
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("*, levels(*)")
      .eq("id", class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check enrollment limit (max 50 students)
    const { count: enrollmentCount } = await supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", class_id)
      .eq("status", "enrolled");

    if (enrollmentCount && enrollmentCount >= (classData.max_students || 50)) {
      return new Response(
        JSON.stringify({ error: "Class is full", message: "This class has reached maximum enrollment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("class_id", class_id)
      .eq("student_id", user.id)
      .eq("status", "enrolled")
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(
        JSON.stringify({ error: "Already enrolled in this class" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let priceAmount = classData.price || 0;
    let discountAmount = 0;
    let appliedDiscountCode = "";

    // Apply discount code if provided
    if (discount_code) {
      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discount_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (discount) {
        const now = new Date();
        const validFrom = new Date(discount.valid_from);
        const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

        if (now >= validFrom && (!validUntil || now <= validUntil)) {
          if (!discount.max_uses || discount.current_uses < discount.max_uses) {
            if (!discount.class_id || discount.class_id === class_id) {
              if (discount.discount_type === "percentage") {
                discountAmount = (priceAmount * discount.discount_value) / 100;
              } else {
                discountAmount = discount.discount_value;
              }
              priceAmount = Math.max(0, priceAmount - discountAmount);
              appliedDiscountCode = discount_code.toUpperCase();
            }
          }
        }
      }
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user.id)
      .single();

    let customerId: string;

    // Check for existing subscription with Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: plan_type === "subscription" ? "subscription" : "payment",
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        user_id: user.id,
        class_id: class_id,
        plan_type: plan_type,
        discount_code: appliedDiscountCode,
      },
      line_items: [
        {
          price_data: {
            currency: classData.currency?.toLowerCase() || "eur",
            product_data: {
              name: classData.name,
              description: `${classData.levels?.name || "Course"} - ${classData.description || ""}`,
            },
            unit_amount: Math.round(priceAmount * 100), // Convert to cents
            ...(plan_type === "subscription" && {
              recurring: {
                interval: "month",
              },
            }),
          },
          quantity: 1,
        },
      ],
    };

    // Handle installment plans
    if (plan_type === "installment" && installment_plan_id) {
      const { data: installmentPlan } = await supabase
        .from("installment_plans")
        .select("*")
        .eq("id", installment_plan_id)
        .eq("is_active", true)
        .single();

      if (installmentPlan) {
        sessionParams.payment_intent_data = {
          metadata: {
            installment_plan_id: installment_plan_id,
            total_installments: String(installmentPlan.total_installments),
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create pending subscription record
    await supabase.from("subscriptions").insert({
      user_id: user.id,
      class_id: class_id,
      stripe_customer_id: customerId,
      plan_type: plan_type,
      installment_plan_id: installment_plan_id || null,
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
