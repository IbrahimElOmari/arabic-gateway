import { formatDistanceToNow, format } from "date-fns";
import { nl, enUS, ar } from "date-fns/locale";
import i18n from "@/i18n";

export function getDateLocale() {
  const lang = i18n.language;
  if (lang === "nl") return nl;
  if (lang === "ar") return ar;
  return enUS;
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: getDateLocale() });
}

export function formatDate(date: Date | string, pattern: string = "PPP"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: getDateLocale() });
}
