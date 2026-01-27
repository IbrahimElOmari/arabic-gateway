import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Smile, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJIS = ["👍", "❤️", "😊", "🎉", "👏", "🙏", "💪", "✨"];

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user's enrolled classes
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["chat-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("class_id, class:classes(id, name)")
        .eq("student_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get teacher's classes
  const { data: teacherClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const allClasses = [
    ...(enrollments?.map(e => e.class) || []),
    ...(teacherClasses || []),
  ].filter((c, i, arr) => arr.findIndex(x => x?.id === c?.id) === i);

  useEffect(() => {
    if (allClasses.length > 0 && !selectedClass) {
      setSelectedClass(allClasses[0]?.id || null);
    }
  }, [allClasses, selectedClass]);

  // Get messages for selected class
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedClass],
    queryFn: async () => {
      const { data: messagesData, error } = await supabase
        .from("chat_messages")
        .select("*, reactions:chat_reactions(id, emoji, user_id)")
        .eq("class_id", selectedClass!)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      
      // Fetch sender profiles
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return messagesData.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || null,
      }));
    },
    enabled: !!selectedClass,
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedClass) return;

    const channel = supabase
      .channel(`chat-${selectedClass}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `class_id=eq.${selectedClass}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reactions",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("chat_messages").insert({
        class_id: selectedClass!,
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const existing = messages?.find(m => m.id === messageId)?.reactions?.find(
        (r: any) => r.user_id === user!.id && r.emoji === emoji
      );
      
      if (existing) {
        await supabase.from("chat_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("chat_reactions").insert({
          message_id: messageId,
          user_id: user!.id,
          emoji,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] });
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  if (enrollmentsLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (allClasses.length === 0) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("chat.noClasses", "No classes yet")}</h3>
              <p className="text-muted-foreground">{t("chat.enrollFirst", "Enroll in a class to join the chat")}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="container py-4 h-[calc(100vh-4rem)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{t("chat.title", "Class Chat")}</h1>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
            {allClasses.map((cls) => (
              <Button
                key={cls?.id}
                variant={selectedClass === cls?.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClass(cls?.id || null)}
              >
                {cls?.name}
              </Button>
            ))}
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg">
              {allClasses.find(c => c?.id === selectedClass)?.name}
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  const reactionGroups = message.reactions?.reduce((acc: Record<string, number>, r: any) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {}) || {};

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && (
                          <span className="text-xs text-muted-foreground mb-1 block">
                            {message.sender?.full_name}
                          </span>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          {Object.entries(reactionGroups).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                              className="text-xs bg-muted rounded-full px-2 py-0.5 hover:bg-muted/80"
                            >
                              {emoji} {count as number}
                            </button>
                          ))}
                          
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground p-1">
                                <Smile className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                              <div className="flex gap-1">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })}
                                    className="text-lg hover:bg-muted rounded p-1"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("chat.noMessages", "No messages yet. Start the conversation!")}</p>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder={t("chat.typeMessage", "Type a message...")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              />
              <Button onClick={handleSend} disabled={!newMessage.trim() || sendMessageMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
