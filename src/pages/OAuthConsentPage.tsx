import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ConsentClient = { name?: string | null; client_uri?: string | null };
type ConsentDetails = {
  client?: ConsentClient | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: ConsentDetails | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: decisionError } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {error ? (
          <>
            <CardHeader>
              <CardTitle>Authorization failed</CardTitle>
              <CardDescription>Could not complete this authorization request.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
          </>
        ) : !details ? (
          <CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Connect {clientName} to your account</CardTitle>
              <CardDescription>
                This lets {clientName} read Arabic Gateway data as you, using your own permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                Approve
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">
                Deny
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
