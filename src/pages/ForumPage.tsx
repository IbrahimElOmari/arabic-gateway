import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, BookOpen, Users, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const iconMap: Record<string, React.ElementType> = {
  "message-circle": MessageCircle,
  "book-open": BookOpen,
  "users": Users,
  "sparkles": Sparkles,
};

// Map room names to translation keys
const roomNameToKey: Record<string, string> = {
  "general": "general",
  "exercises": "exercises",
  "resources": "resources",
  "collaboration": "collaboration",
};

export default function ForumPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["forum-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_rooms")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: postCounts } = useQuery({
    queryKey: ["forum-post-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("room_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(post => {
        counts[post.room_id] = (counts[post.room_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const getRoomName = (room: any) => {
    const lang = i18n.language;
    if (lang === "nl") return room.name_nl;
    if (lang === "ar") return room.name_ar;
    return room.name_en;
  };

  const getRoomDescription = (roomName: string) => {
    const key = roomNameToKey[roomName.toLowerCase()];
    if (key) {
      return t(`forum.roomDescriptions.${key}`);
    }
    return "";
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("forum.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("forum.description")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rooms?.map((room) => {
              const Icon = iconMap[room.icon] || MessageCircle;
              const count = postCounts?.[room.id] || 0;
              
              return (
                <Link key={room.id} to={`/forum/${room.name}`}>
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{getRoomName(room)}</CardTitle>
                          <CardDescription>
                            {count} {t("forum.posts")}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {getRoomDescription(room.name)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
