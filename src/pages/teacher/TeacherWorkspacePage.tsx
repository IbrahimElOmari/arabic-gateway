import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiQuery } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  teacher_id: string | null;
}

interface EnrollmentRow {
  id: string;
  class_id: string;
  student_id: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function TeacherWorkspacePage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: classes, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ["workspace-classes", user?.id, isAdmin],
    queryFn: () =>
      apiQuery<ClassRow[]>("classes", (q) => {
        const base = q.select("id,name,description,is_active,teacher_id").eq("is_active", true);
        return isAdmin ? base.order("name") : base.eq("teacher_id", user!.id).order("name");
      }),
    enabled: !!user,
  });

  const classIds = useMemo(() => (classes ?? []).map((c) => c.id), [classes]);

  const { data: enrollments, isLoading: enrolLoading, error: enrolError } = useQuery({
    queryKey: ["workspace-enrollments", classIds.join(",")],
    queryFn: () =>
      apiQuery<EnrollmentRow[]>("class_enrollments", (q) =>
        q.select("id,class_id,student_id").in("class_id", classIds).eq("status", "enrolled")
      ),
    enabled: classIds.length > 0,
  });

  const studentIds = useMemo(
    () => Array.from(new Set((enrollments ?? []).map((e) => e.student_id))),
    [enrollments]
  );

  const { data: profiles, error: profilesError } = useQuery({
    queryKey: ["workspace-profiles", studentIds.join(",")],
    queryFn: () =>
      apiQuery<ProfileRow[]>("profiles", (q) =>
        q.select("user_id,full_name,email,avatar_url").in("user_id", studentIds)
      ),
    enabled: studentIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    (profiles ?? []).forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const studentsByClass = useMemo(() => {
    const m = new Map<string, ProfileRow[]>();
    (enrollments ?? []).forEach((e) => {
      const p = profileMap.get(e.student_id);
      if (!p) return;
      const arr = m.get(e.class_id) ?? [];
      arr.push(p);
      m.set(e.class_id, arr);
    });
    return m;
  }, [enrollments, profileMap]);

  const err = classesError || enrolError || profilesError;
  if (err) {
    toast({ variant: "destructive", title: t("common.error", "Fout"), description: (err as Error).message });
  }

  if (classesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("workspace.title", "Werkruimte")}</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? t("workspace.adminSubtitle", "Alle klassen en leerlingen.")
            : t("workspace.teacherSubtitle", "Jouw klassen en leerlingen.")}
        </p>
      </div>

      {(classes ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("workspace.noClasses", "Geen klassen gevonden.")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(classes ?? []).map((cls) => {
            const students = studentsByClass.get(cls.id) ?? [];
            return (
              <Card key={cls.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> {cls.name}
                    </span>
                    <Badge variant="secondary">
                      {students.length} {t("workspace.students", "leerlingen")}
                    </Badge>
                  </CardTitle>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {enrolLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("workspace.noStudents", "Geen actieve leerlingen.")}
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {students.map((s) => (
                        <li key={s.user_id}>
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-between h-auto py-3"
                          >
                            <Link to={`/teacher/students/${s.user_id}`}>
                              <span className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={s.avatar_url ?? undefined} />
                                  <AvatarFallback>
                                    {(s.full_name ?? s.email ?? "?").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-start">
                                  <span className="block font-medium">{s.full_name ?? "—"}</span>
                                  <span className="block text-xs text-muted-foreground">{s.email}</span>
                                </span>
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
