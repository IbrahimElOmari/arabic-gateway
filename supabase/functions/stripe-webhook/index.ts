import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      console.error("Stripe not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const classId = session.metadata?.class_id;
        const planType = session.metadata?.plan_type;
        const discountCode = session.metadata?.discount_code;

        if (!userId || !classId) {
          console.error("Missing metadata in checkout session");
          break;
        }

        // Update subscription to active
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_id: session.subscription as string || null,
            current_period_start: new Date().toISOString(),
            current_period_end: planType === "subscription" 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
              : null,
          })
          .eq("user_id", userId)
          .eq("class_id", classId)
          .eq("status", "pending");

        // Create class enrollment
        const { data: existingEnrollment } = await supabase
          .from("class_enrollments")
          .select("id")
          .eq("class_id", classId)
          .eq("student_id", userId)
          .maybeSingle();

        if (!existingEnrollment) {
          await supabase.from("class_enrollments").insert({
            class_id: classId,
            student_id: userId,
            status: "enrolled",
          });
        } else {
          await supabase
            .from("class_enrollments")
            .update({ status: "enrolled" })
            .eq("id", existingEnrollment.id);
        }

        // Record payment
        await supabase.from("payments").insert({
          user_id: userId,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          status: "succeeded",
          payment_method: "stripe",
          stripe_payment_intent_id: session.payment_intent as string || null,
        });

        // Update discount code usage
        if (discountCode) {
          await supabase.rpc("increment_discount_usage", { p_code: discountCode });
        }

        // Send enrollment confirmation email
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, full_name, preferred_language")
          .eq("user_id", userId)
          .single();

        const { data: classInfo } = await supabase
          .from("classes")
          .select("name, level_id, start_date, levels(name_nl, name_en, name_ar)")
          .eq("id", classId)
          .single();

        if (userProfile?.email) {
          const lang = userProfile.preferred_language || "nl";
          const levelData = classInfo?.levels as any;
          const levelName = lang === "ar" ? levelData?.name_ar : 
                            lang === "en" ? levelData?.name_en : levelData?.name_nl;

          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                type: "enrollment_confirmation",
                to: userProfile.email,
                language: lang,
                data: {
                  name: userProfile.full_name,
                  className: classInfo?.name,
                  levelName: levelName,
                  startDate: classInfo?.start_date || "Binnenkort",
                  dashboardUrl: "https://huisvanhetarabisch.nl/dashboard",
                },
              }),
            });
          } catch (emailError) {
            console.error("Failed to send enrollment email:", emailError);
          }
        }

        console.log(`Enrollment completed for user ${userId} in class ${classId}`);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Update subscription period
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          // Record payment
          const customerId = invoice.customer as string;
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("user_id, class_id, classes(name)")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (subscription) {
            await supabase.from("payments").insert({
              user_id: subscription.user_id,
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency?.toUpperCase() || "EUR",
              status: "succeeded",
              payment_method: "stripe",
              stripe_payment_intent_id: invoice.payment_intent as string || null,
            });

            // Send payment confirmation email
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name, preferred_language")
              .eq("user_id", subscription.user_id)
              .single();

            if (userProfile?.email) {
              const classData = subscription.classes as any;
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    type: "payment_confirmation",
                    to: userProfile.email,
                    language: userProfile.preferred_language || "nl",
                    data: {
                      name: userProfile.full_name,
                      amount: ((invoice.amount_paid || 0) / 100).toFixed(2),
                      className: classData?.name || "Klas",
                      paymentDate: new Date().toLocaleDateString("nl-NL"),
                      paymentId: invoice.id,
                    },
                  }),
                });
              } catch (emailError) {
                console.error("Failed to send payment confirmation email:", emailError);
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);

          // Log for admin notification
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("user_id, class_id, classes(name)")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (subscription) {
            await supabase.from("admin_activity_log").insert({
              admin_id: "00000000-0000-0000-0000-000000000000", // System
              action: "payment_failed",
              target_table: "subscriptions",
              target_id: subscription.user_id,
              details: {
                class_id: subscription.class_id,
                invoice_id: invoice.id,
                amount: invoice.amount_due / 100,
              },
            });

            // Send payment failed email to user
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("email, full_name, preferred_language")
              .eq("user_id", subscription.user_id)
              .single();

            if (userProfile?.email) {
              const classData = subscription.classes as any;
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    type: "payment_failed",
                    to: userProfile.email,
                    language: userProfile.preferred_language || "nl",
                    data: {
                      name: userProfile.full_name,
                      amount: ((invoice.amount_due || 0) / 100).toFixed(2),
                      className: classData?.name || "Klas",
                      retryUrl: "https://huisvanhetarabisch.nl/dashboard",
                    },
                  }),
                });
              } catch (emailError) {
                console.error("Failed to send payment failed email:", emailError);
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status === "active" ? "active" :
                    subscription.status === "past_due" ? "past_due" :
                    subscription.status === "canceled" ? "canceled" :
                    subscription.status === "paused" ? "paused" : "pending",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
