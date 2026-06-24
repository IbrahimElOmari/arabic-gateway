import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { apiQuery } from "@/lib/supabase-api";

interface ReviewRow {
  id: string;
  student_id: string;
  item_id: string;
  answer_text: string | null;
  created_at: string;
  curriculum_items: {
    id: string;
    unit_code: string | null;
    instruction_nl: string | null;
    question: string | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
}

export default function TeacherReviewQueuePage() {
  const navigate = useNavigate();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["teacher-review-queue"],
    queryFn: async () =>
      apiQuery<ReviewRow[]>("curriculum_item_attempts", (q) =>
        q
          .select(
            "id, student_id, item_id, answer_text, created_at, curriculum_items!inner(id, unit_code, instruction_nl, question), profiles:student_id(id, full_name)"
          )
          .is("is_correct", null)
          .order("created_at", { ascending: false })
      ),
    refetchInterval: 60000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6" dir="auto">
      <div className="flex items-center gap-3">
        <FileCheck className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Na te kijken</h1>
          <p className="text-sm text-muted-foreground">
            Open-tekst-inzendingen die wachten op jouw beoordeling.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !rows || rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Geen openstaande inzendingen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const studentName = r.profiles?.full_name || "Onbekende leerling";
            const week = r.curriculum_items?.unit_code || "—";
            const oef =
              r.curriculum_items?.instruction_nl ||
              r.curriculum_items?.question ||
              "Oefening";
            const answer = (r.answer_text || "").trim();
            const shortAnswer =
              answer.length > 160 ? answer.slice(0, 160) + "…" : answer;
            return (
              <Card
                key={r.id}
                className="cursor-pointer transition-colors hover:bg-accent/40"
                onClick={() => navigate(`/teacher/students/${r.student_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/teacher/students/${r.student_id}`);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base">{studentName}</CardTitle>
                    <Badge variant="secondary">{format(new Date(r.created_at), "dd-MM-yyyy HH:mm")}</Badge>
                  </div>
                  <CardDescription>
                    <span className="font-medium">Week {week}</span> · {oef}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
                    {shortAnswer || <span className="italic text-muted-foreground">(geen tekst)</span>}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline">Open dossier</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
