import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManualPaymentRequest {
  user_id: string;
  class_id: string;
  amount: number;
  currency?: string;
  payment_method: "cash" | "bank_transfer" | "manual";
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ManualPaymentRequest = await req.json();
    const { user_id, class_id, amount, currency = "EUR", payment_method, notes } = body;

    // Validate required fields
    if (!user_id || !class_id || !amount || !payment_method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if class exists
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, max_students")
      .eq("id", class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check enrollment limit
    const { count: enrollmentCount } = await supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", class_id)
      .eq("status", "enrolled");

    if (enrollmentCount && enrollmentCount >= (classData.max_students || 50)) {
      return new Response(
        JSON.stringify({ error: "Class is full" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("class_id", class_id)
      .maybeSingle();

    let subscriptionId: string;

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_type: "one_time",
        })
        .eq("id", existingSub.id);
      subscriptionId = existingSub.id;
    } else {
      const { data: newSub } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user_id,
          class_id: class_id,
          status: "active",
          plan_type: "one_time",
        })
        .select("id")
        .single();
      subscriptionId = newSub!.id;
    }

    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user_id,
        subscription_id: subscriptionId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "succeeded",
        payment_method: payment_method,
        notes: notes || `Manual payment recorded by admin ${user.email}`,
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Create class enrollment
    const { data: existingEnrollment } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("class_id", class_id)
      .eq("student_id", user_id)
      .maybeSingle();

    if (!existingEnrollment) {
      await supabase.from("class_enrollments").insert({
        class_id: class_id,
        student_id: user_id,
        status: "enrolled",
      });
    } else {
      await supabase
        .from("class_enrollments")
        .update({ status: "enrolled" })
        .eq("id", existingEnrollment.id);
    }

    // Log admin activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      action: "manual_payment_recorded",
      target_table: "payments",
      target_id: payment.id,
      details: {
        student_id: user_id,
        class_id: class_id,
        amount: amount,
        currency: currency,
        payment_method: payment_method,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        subscription_id: subscriptionId,
        message: "Payment recorded and student enrolled successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Manual payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
