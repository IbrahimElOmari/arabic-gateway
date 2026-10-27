import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function UnitLockedNotice({ unlockDate }: { unlockDate?: string | null }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="container py-12">
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center gap-3">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {t("selfStudy.lockedTitle", "Deze week is nog niet vrijgegeven voor jouw klas")}
          </h2>
          {unlockDate && (
            <p className="text-muted-foreground">
              {t("selfStudy.opensOn", "Opent op")}{" "}
              {new Date(unlockDate).toLocaleDateString(i18n.language)}
            </p>
          )}
          <Button asChild>
            <Link to="/self-study">{t("selfStudy.backToUnits", "Terug naar zelfstudie")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
