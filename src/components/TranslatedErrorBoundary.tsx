import React from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "./ErrorBoundary";

export default function TranslatedErrorBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      fallbackTitle={t("common.errorTitle", "Er ging iets mis")}
      fallbackDescription={t("common.errorDescription", "Er is een onverwachte fout opgetreden. Probeer het opnieuw.")}
      fallbackButtonText={t("common.retry", "Opnieuw proberen")}
    >
      {children}
    </ErrorBoundary>
  );
}
