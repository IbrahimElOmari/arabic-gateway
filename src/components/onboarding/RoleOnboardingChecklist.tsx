import { CheckCircle2, ClipboardList, GraduationCap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Role = "student" | "teacher" | "admin";

interface ChecklistItem {
  label: string;
  to: string;
  done?: boolean;
}

interface RoleOnboardingChecklistProps {
  role: Role;
  completedCount?: number;
  classCount?: number;
  pendingCount?: number;
}

export function RoleOnboardingChecklist({ role, completedCount = 0, classCount = 0, pendingCount = 0 }: RoleOnboardingChecklistProps) {
  const { t } = useTranslation();

  const roleConfig = {
    student: {
      icon: GraduationCap,
      title: t("onboarding.studentTitle", "Start je leerpad"),
      description: t("onboarding.studentDescription", "Rond je eerste acties af en ga direct verder met leren."),
      items: [
        { label: t("onboarding.chooseClass", "Kies of bevestig je klas"), to: "/pricing", done: classCount > 0 },
        { label: t("onboarding.startExercise", "Start je eerste oefening"), to: "/self-study", done: completedCount > 0 },
        { label: t("onboarding.checkProgress", "Bekijk je voortgang"), to: "/progress", done: completedCount > 2 },
      ],
    },
    teacher: {
      icon: ClipboardList,
      title: t("onboarding.teacherTitle", "Richt je klasomgeving in"),
      description: t("onboarding.teacherDescription", "Maak lesmateriaal, plan lessen en beoordeel inzendingen vanuit één startpunt."),
      items: [
        { label: t("onboarding.reviewClasses", "Controleer je klassen"), to: "/teacher", done: classCount > 0 },
        { label: t("onboarding.createLesson", "Plan of beheer een les"), to: "/teacher/lessons" },
        { label: t("onboarding.reviewSubmissions", "Beoordeel openstaande inzendingen"), to: "/teacher/submissions", done: pendingCount === 0 },
      ],
    },
    admin: {
      icon: ShieldCheck,
      title: t("onboarding.adminTitle", "Platformcontrole"),
      description: t("onboarding.adminDescription", "Controleer gebruikers, inschrijvingen en operationele status."),
      items: [
        { label: t("onboarding.reviewUsers", "Controleer gebruikers en rollen"), to: "/admin/users" },
        { label: t("onboarding.reviewEnrollments", "Werk inschrijvingsaanvragen af"), to: "/admin/enrollments", done: pendingCount === 0 },
        { label: t("onboarding.reviewDesign", "Controleer design-system regressies"), to: "/admin/design-system" },
      ],
    },
  } satisfies Record<Role, { icon: typeof GraduationCap; title: string; description: string; items: ChecklistItem[] }>;

  const config = roleConfig[role];
  const Icon = config.icon;
  const doneCount = config.items.filter((item) => item.done).length;
  const progress = Math.round((doneCount / config.items.length) * 100);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              {config.title}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <span className="text-sm font-medium text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {config.items.map((item) => (
          <Button key={item.label} variant="outline" className="h-auto justify-start whitespace-normal py-3 text-start" asChild>
            <Link to={item.to}>
              <CheckCircle2 className={item.done ? "h-4 w-4 text-success" : "h-4 w-4 text-muted-foreground"} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}