// Admin-only edge function to translate i18n entries from Dutch to a target
// language using Lovable AI. Returns structured JSON via tool-calling.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  target: z.enum(["en", "ar"]),
  entries: z.record(z.string().min(1), z.string().min(1)).refine(
    (e) => Object.keys(e).length > 0 && Object.keys(e).length <= 50,
    { message: "entries must contain between 1 and 50 items" },
  ),
});

const SYSTEM_PROMPTS: Record<"en" | "ar", string> = {
  en:
    'You translate UI strings for "Huis van het Arabisch", an Arabic-learning platform. ' +
    "Translate the provided Dutch source strings to natural, concise English suitable for a web UI. " +
    "Preserve every {{variable}} placeholder, HTML tag and punctuation EXACTLY as in the source. " +
    "Do not add quotes around the result. Return ONLY via the provided tool call.",
  ar:
    'You translate UI strings for "Huis van het Arabisch", an Arabic-learning platform. ' +
    "Translate the provided Dutch source strings to Modern Standard Arabic (فصحى) suitable for a web UI. " +
    "Preserve every {{variable}} placeholder, HTML tag and punctuation EXACTLY as in the source. " +
    "Do not add quotes. Return ONLY via the provided tool call.",
};

function preservesPlaceholders(src: string, out: string): boolean {
  const re = /\{\{[\w.]+\}\}/g;
  const a = (src.match(re) || []).sort();
  const b = (out.match(re) || []).sort();
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: require admin role.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { target, entries } = parsed.data;

    const userPayload = JSON.stringify(entries, null, 2);
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[target] },
            {
              role: "user",
              content:
                `Translate the values of this JSON object. Keep keys identical. Source language: Dutch. ` +
                `Target language: ${target === "en" ? "English" : "Arabic (MSA)"}.\n\n` +
                userPayload,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_translations",
                description: "Return translated strings keyed by original key",
                parameters: {
                  type: "object",
                  properties: {
                    translations: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                  },
                  required: ["translations"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_translations" } },
        }),
      },
    );

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limited, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted, please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error", aiResp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI returned no structured output" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let translations: Record<string, string> = {};
    try {
      const args = JSON.parse(toolCall.function.arguments);
      translations = args.translations ?? {};
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate placeholders + drop entries that don't match.
    const accepted: Record<string, string> = {};
    const skipped: string[] = [];
    for (const [k, src] of Object.entries(entries)) {
      const out = translations[k];
      if (typeof out !== "string" || !out.trim()) {
        skipped.push(k);
        continue;
      }
      if (!preservesPlaceholders(src, out)) {
        skipped.push(k);
        continue;
      }
      accepted[k] = out;
    }

    return new Response(
      JSON.stringify({ translations: accepted, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-translate-i18n error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
