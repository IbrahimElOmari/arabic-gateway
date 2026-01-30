import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as OTPAuth from "https://esm.sh/otpauth@9.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  action: "setup";
}

interface VerifyRequest {
  action: "verify";
  code: string;
}

interface DisableRequest {
  action: "disable";
  code: string;
}

interface UseBackupRequest {
  action: "use_backup";
  backupCode: string;
}

type TwoFactorRequest = SetupRequest | VerifyRequest | DisableRequest | UseBackupRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or teacher (2FA is required for them)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isPrivilegedUser = roleData?.role === "admin" || roleData?.role === "teacher";

    const body: TwoFactorRequest = await req.json();

    switch (body.action) {
      case "setup": {
        // Generate new TOTP secret
        const secret = new OTPAuth.Secret({ size: 20 });
        const totp = new OTPAuth.TOTP({
          issuer: "Huis van het Arabisch",
          label: user.email || user.id,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: secret,
        });

        // Generate backup codes
        const backupCodes: string[] = [];
        for (let i = 0; i < 10; i++) {
          const code = Array.from({ length: 8 }, () => 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
          ).join("");
          backupCodes.push(code);
        }

        // Store (not enabled yet, user must verify first)
        await supabase
          .from("user_two_factor")
          .upsert({
            user_id: user.id,
            totp_secret: secret.base32,
            backup_codes: backupCodes,
            is_enabled: false,
            method: "totp",
          });

        return new Response(
          JSON.stringify({
            success: true,
            secret: secret.base32,
            qrCodeUrl: totp.toString(),
            backupCodes: backupCodes,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        // Get stored secret
        const { data: twoFactor } = await supabase
          .from("user_two_factor")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!twoFactor?.totp_secret) {
          return new Response(
            JSON.stringify({ error: "2FA not set up" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const totp = new OTPAuth.TOTP({
          issuer: "Huis van het Arabisch",
          label: user.email || user.id,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(twoFactor.totp_secret),
        });

        const delta = totp.validate({ token: body.code, window: 1 });
        const isValid = delta !== null;

        // Log attempt
        await supabase
          .from("two_factor_attempts")
          .insert({
            user_id: user.id,
            method: "totp",
            success: isValid,
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
          });

        if (isValid) {
          // Enable 2FA if this was setup verification
          if (!twoFactor.is_enabled) {
            await supabase
              .from("user_two_factor")
              .update({ is_enabled: true, last_used_at: new Date().toISOString() })
              .eq("user_id", user.id);
          } else {
            await supabase
              .from("user_two_factor")
              .update({ last_used_at: new Date().toISOString() })
              .eq("user_id", user.id);
          }

          return new Response(
            JSON.stringify({ success: true, verified: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, verified: false, error: "Invalid code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "disable": {
        // Verify code first
        const { data: twoFactor } = await supabase
          .from("user_two_factor")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!twoFactor?.totp_secret) {
          return new Response(
            JSON.stringify({ error: "2FA not set up" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Admin/teachers cannot disable 2FA
        if (isPrivilegedUser) {
          return new Response(
            JSON.stringify({ error: "Privileged users cannot disable 2FA" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const totp = new OTPAuth.TOTP({
          issuer: "Huis van het Arabisch",
          label: user.email || user.id,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(twoFactor.totp_secret),
        });

        const delta = totp.validate({ token: body.code, window: 1 });
        if (delta === null) {
          return new Response(
            JSON.stringify({ error: "Invalid code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("user_two_factor")
          .delete()
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true, disabled: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "use_backup": {
        const { data: twoFactor } = await supabase
          .from("user_two_factor")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!twoFactor?.backup_codes) {
          return new Response(
            JSON.stringify({ error: "No backup codes available" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const codeIndex = twoFactor.backup_codes.indexOf(body.backupCode.toUpperCase());
        if (codeIndex === -1) {
          await supabase
            .from("two_factor_attempts")
            .insert({
              user_id: user.id,
              method: "totp",
              success: false,
              ip_address: req.headers.get("x-forwarded-for") || "unknown",
              user_agent: req.headers.get("user-agent") || "unknown",
            });

          return new Response(
            JSON.stringify({ error: "Invalid backup code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove used backup code
        const remainingCodes = twoFactor.backup_codes.filter((_: string, i: number) => i !== codeIndex);
        await supabase
          .from("user_two_factor")
          .update({ 
            backup_codes: remainingCodes,
            last_used_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        await supabase
          .from("two_factor_attempts")
          .insert({
            user_id: user.id,
            method: "totp",
            success: true,
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            user_agent: req.headers.get("user-agent") || "unknown",
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            verified: true,
            remainingBackupCodes: remainingCodes.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("2FA error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
