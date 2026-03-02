import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function FullPageLoader() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-lg font-medium text-foreground">
          Het laden duurt langer dan verwacht.
        </p>
        <p className="text-sm text-muted-foreground">
          Er kan een netwerkprobleem zijn. Probeer de pagina opnieuw te laden.
        </p>
        <Button onClick={() => window.location.reload()}>
          Pagina herladen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
