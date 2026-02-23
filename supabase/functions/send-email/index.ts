import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createLogger } from "../_shared/logger.ts";
import { requireEnv } from "../_shared/validate-env.ts";

Deno.serve(async (req) => {
  const logger = createLogger("send-email", req);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = requireEnv("RESEND_API_KEY");
    const resend = new Resend(resendApiKey);

    const { to, subject, html, from } = await req.json();

    if (!to || !subject || !html) {
      logger.error("Missing parameters");
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await resend.emails.send({
      from: from || "Huis van het Arabisch <info@huisvanhetarabisch.nl>",
      to,
      subject,
      html,
    });

    if (error) {
      logger.error("Resend error", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Email sent", { messageId: data?.id });
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Unexpected error", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
