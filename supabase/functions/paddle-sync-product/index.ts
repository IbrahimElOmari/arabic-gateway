// Admin-only: create/update Paddle products & prices for a class or extra product,
// then persist the returned Paddle IDs in our database.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const BodySchema = z.object({
  kind: z.enum(["class", "extra"]),
  id: z.string().uuid(),
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  currency: z.string().min(3).max(3).default("EUR"),
  trial_days: z.number().int().min(0).max(365).optional(),
  // For classes: monthly + yearly (either may be null to skip/archive)
  price_monthly: z.number().nullable().optional(),
  price_yearly: z.number().nullable().optional(),
  // For extras: one-time price
  price_one_time: z.number().nullable().optional(),
});

type Body = z.infer<typeof BodySchema>;

async function paddle<T = any>(env: PaddleEnv, path: string, init?: RequestInit): Promise<T> {
  const res = await gatewayFetch(env, path, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Paddle ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : ({} as T);
}

async function ensureProduct(env: PaddleEnv, existingId: string | null, name: string, description: string | null | undefined) {
  if (existingId) {
    await paddle(env, `/products/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description: description ?? null }),
    });
    return existingId;
  }
  const created = await paddle<{ data: { id: string } }>(env, `/products`, {
    method: "POST",
    body: JSON.stringify({ name, description: description ?? null, tax_category: "standard" }),
  });
  return created.data.id;
}

async function upsertPrice(
  env: PaddleEnv,
  existingId: string | null,
  productId: string,
  amountMinor: number,
  currency: string,
  recurring: { interval: "month" | "year"; trial_days?: number } | null,
  description: string,
) {
  const body: Record<string, unknown> = {
    description,
    unit_price: { amount: String(amountMinor), currency_code: currency.toUpperCase() },
    quantity: { minimum: 1, maximum: 1 },
  };
  if (recurring) {
    body.billing_cycle = { interval: recurring.interval, frequency: 1 };
    if (recurring.trial_days && recurring.trial_days > 0) {
      body.trial_period = { interval: "day", frequency: recurring.trial_days };
    }
  }
  if (existingId) {
    const updated = await paddle<{ data: { id: string } }>(env, `/prices/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...body, status: "active" }),
    });
    return updated.data.id;
  }
  const created = await paddle<{ data: { id: string } }>(env, `/prices`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, ...body }),
  });
  return created.data.id;
}

async function archivePrice(env: PaddleEnv, id: string) {
  try {
    await paddle(env, `/prices/${id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
  } catch (e) {
    console.warn("archivePrice failed", id, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body: Body = parsed.data;
    const env: PaddleEnv = body.environment;

    if (body.kind === "class") {
      const { data: row, error } = await admin.from("classes").select("id, name, paddle_product_id, paddle_price_id_monthly, paddle_price_id_yearly").eq("id", body.id).maybeSingle();
      if (error || !row) throw new Error("Class not found");

      const productId = await ensureProduct(env, row.paddle_product_id, body.name, body.description ?? null);

      let monthlyId: string | null = row.paddle_price_id_monthly ?? null;
      let yearlyId: string | null = row.paddle_price_id_yearly ?? null;

      if (body.price_monthly && body.price_monthly > 0) {
        monthlyId = await upsertPrice(env, monthlyId, productId, Math.round(body.price_monthly * 100), body.currency, { interval: "month", trial_days: body.trial_days }, `${body.name} – Monthly`);
      } else if (monthlyId) {
        await archivePrice(env, monthlyId);
        monthlyId = null;
      }

      if (body.price_yearly && body.price_yearly > 0) {
        yearlyId = await upsertPrice(env, yearlyId, productId, Math.round(body.price_yearly * 100), body.currency, { interval: "year", trial_days: body.trial_days }, `${body.name} – Yearly`);
      } else if (yearlyId) {
        await archivePrice(env, yearlyId);
        yearlyId = null;
      }

      await admin.from("classes").update({
        paddle_product_id: productId,
        paddle_price_id_monthly: monthlyId,
        paddle_price_id_yearly: yearlyId,
        price_monthly: body.price_monthly ?? null,
        price_yearly: body.price_yearly ?? null,
        currency: body.currency,
        trial_days: body.trial_days ?? 0,
      }).eq("id", body.id);

      return new Response(JSON.stringify({ productId, monthlyId, yearlyId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // kind === "extra"
    const { data: row, error } = await admin.from("extra_products").select("id, paddle_product_id, paddle_price_id").eq("id", body.id).maybeSingle();
    if (error || !row) throw new Error("Extra product not found");

    const productId = await ensureProduct(env, row.paddle_product_id, body.name, body.description ?? null);
    let priceId: string | null = row.paddle_price_id ?? null;
    if (body.price_one_time && body.price_one_time > 0) {
      priceId = await upsertPrice(env, priceId, productId, Math.round(body.price_one_time * 100), body.currency, null, body.name);
    } else if (priceId) {
      await archivePrice(env, priceId);
      priceId = null;
    }

    await admin.from("extra_products").update({
      paddle_product_id: productId,
      paddle_price_id: priceId,
      price: body.price_one_time ?? 0,
      currency: body.currency,
      name: body.name,
      description: body.description ?? null,
    }).eq("id", body.id);

    return new Response(JSON.stringify({ productId, priceId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("paddle-sync-product error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
