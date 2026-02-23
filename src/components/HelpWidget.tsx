import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle, X, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import config from "@/lib/app-config";

interface HelpWidgetProps {
  showHelpWidget?: boolean;
}

export function HelpWidget({ showHelpWidget }: HelpWidgetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Check app-config and prop
  const enabled = showHelpWidget ?? config.helpWidget?.enabled ?? true;
  if (!enabled) return null;

  const position = config.helpWidget?.position ?? "bottom-right";
  const positionClasses = position === "bottom-left"
    ? "fixed bottom-6 start-6"
    : "fixed bottom-6 end-6";

  return (
    <div className={`${positionClasses} z-50 flex flex-col items-end gap-2`}>
      {open && (
        <div className="mb-2 flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            onClick={() => { navigate("/faq"); setOpen(false); }}
          >
            <BookOpen className="h-4 w-4" />
            {t("help.faq", "FAQ / Kennisbank")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2"
            onClick={() => { navigate("/helpdesk"); setOpen(false); }}
          >
            <MessageCircle className="h-4 w-4" />
            {t("help.support", "Contact Support")}
          </Button>
        </div>
      )}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label={t("help.toggle", "Help openen")}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}