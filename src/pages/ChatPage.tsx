import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Smile, Loader2, Flag, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { formatRelative } from "@/lib/date-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReportContentDialog } from "@/components/moderation/ReportContentDialog";
import { apiQuery, apiMutate } from "@/lib/supabase-api";

const EMOJIS = ["👍", "❤️", "😊", "🎉", "👏", "🙏", "💪", "✨"];
const MESSAGES_PER_PAGE = 50;
const SEND_COOLDOWN_MS = 1000;

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [olderMessages, setOlderMessages] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(false);

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["chat-enrollments", user?.id],
    queryFn: () => apiQuery<any[]>("class_enrollments", (q) => q.select("class_id, class:classes(id, name)").eq("student_id", user!.id)),
    enabled: !!user,
  });

  const { data: teacherClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => apiQuery<any[]>("classes", (q) => q.select("id, name").eq("teacher_id", user!.id)),
    enabled: !!user,
  });

  const allClasses = useMemo(() => {
    return [
      ...(enrollments?.map((e: any) => e.class) || []),
      ...(teacherClasses || []),
    ].filter((c, i, arr) => arr.findIndex((x: any) => x?.id === c?.id) === i);
  }, [enrollments, teacherClasses]);

  useEffect(() => {
    if (allClasses.length > 0 && !selectedClass) {
      setSelectedClass(allClasses[0]?.id || null);
    }
  }, [allClasses, selectedClass]);

  useEffect(() => {
    setOlderMessages([]);
    setHasMore(true);
  }, [selectedClass]);

  const { data: recentMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedClass],
    queryFn: async () => {
      const messagesData = await apiQuery<any[]>("chat_messages", (q) =>
        q.select("*, reactions:chat_reactions(id, emoji, user_id)").eq("class_id", selectedClass!).order("created_at", { ascending: false }).limit(MESSAGES_PER_PAGE)
      );
      const sorted = [...messagesData].reverse();
      const senderIds = [...new Set(sorted.map((m: any) => m.sender_id))];
      const profiles = await apiQuery<any[]>("profiles", (q) => q.select("user_id, full_name, avatar_url").in("user_id", senderIds));
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      const enriched = sorted.map((msg: any) => ({ ...msg, sender: profileMap.get(msg.sender_id) || null }));
      setHasMore(messagesData.length >= MESSAGES_PER_PAGE);
      return enriched;
    },
    enabled: !!selectedClass,
  });

  const messages = useMemo(() => [...olderMessages, ...(recentMessages || [])], [olderMessages, recentMessages]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedClass || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const oldestMessage = messages[0];
    if (!oldestMessage) { setLoadingMore(false); return; }
    try {
      const olderData = await apiQuery<any[]>("chat_messages", (q) =>
        q.select("*, reactions:chat_reactions(id, emoji, user_id)").eq("class_id", selectedClass).lt("created_at", oldestMessage.created_at).order("created_at", { ascending: false }).limit(MESSAGES_PER_PAGE)
      );
      const sorted = [...olderData].reverse();
      const senderIds = [...new Set(sorted.map((m: any) => m.sender_id))];
      const profiles = await apiQuery<any[]>("profiles", (q) => q.select("user_id, full_name, avatar_url").in("user_id", senderIds));
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      const enriched = sorted.map((msg: any) => ({ ...msg, sender: profileMap.get(msg.sender_id) || null }));
      setOlderMessages(prev => [...enriched, ...prev]);
      setHasMore(olderData.length >= MESSAGES_PER_PAGE);
    } catch { /* silently fail */ } finally { setLoadingMore(false); }
  }, [selectedClass, loadingMore, hasMore, messages]);

  // Real-time subscription (keeps using supabase directly - realtime is not wrapped)
  useEffect(() => {
    if (!selectedClass) return;
    const channel = supabase
      .channel(`chat-${selectedClass}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `class_id=eq.${selectedClass}` }, () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedClass, queryClient]);

  useEffect(() => {
    if (scrollRef.current && recentMessages) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }
  }, [recentMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiMutate("chat_messages", (q) => q.insert({ class_id: selectedClass!, sender_id: user!.id, content }));
    },
    onSuccess: () => { setNewMessage(""); setSendCooldown(true); setTimeout(() => setSendCooldown(false), SEND_COOLDOWN_MS); },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const msg = messages?.find((m: any) => m.id === messageId);
      const existing = msg?.reactions?.find((r: any) => r.user_id === user!.id && r.emoji === emoji);
      if (existing) {
        await apiMutate("chat_reactions", (q) => q.delete().eq("id", existing.id));
      } else {
        await apiMutate("chat_reactions", (q) => q.insert({ message_id: messageId, user_id: user!.id, emoji }));
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedClass] }); },
  });

  const handleSend = () => { if (newMessage.trim() && !sendCooldown) { sendMessageMutation.mutate(newMessage); } };

  if (enrollmentsLoading) {
    return (<><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></>);
  }

  if (allClasses.length === 0) {
    return (<><div className="container py-8"><Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><MessageCircle className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">{t("chat.noClasses", "No classes")}</h3><p className="text-muted-foreground">{t("chat.noClassesDescription", "You need to be enrolled in a class to use chat.")}</p></CardContent></Card></div></>);
  }

  return (
    <>
      <div className="container py-4 h-[calc(100vh-4rem)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{t("chat.title", "Class Chat")}</h1>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
            {allClasses.map((cls: any) => (
              <Button key={cls?.id} variant={selectedClass === cls?.id ? "default" : "outline"} size="sm" onClick={() => setSelectedClass(cls?.id || null)}>{cls?.name}</Button>
            ))}
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg">{allClasses.find((c: any) => c?.id === selectedClass)?.name}</CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messagesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {hasMore && (
                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" onClick={loadOlderMessages} disabled={loadingMore} aria-label={t("chat.loadOlder", "Load older messages")}>
                      {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronUp className="h-4 w-4 mr-2" />}
                      {t("chat.loadOlder", "Load older messages")}
                    </Button>
                  </div>
                )}
                {messages.map((message: any) => {
                  const isOwn = message.sender_id === user?.id;
                  const reactionGroups = message.reactions?.reduce((acc: Record<string, number>, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {}) || {};
                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && <span className="text-xs text-muted-foreground mb-1 block">{message.sender?.full_name}</span>}
                        <div className={`rounded-lg px-4 py-2 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {Object.entries(reactionGroups).map(([emoji, count]) => (
                            <button key={emoji} onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })} className="text-xs bg-muted rounded-full px-2 py-0.5 hover:bg-muted/80" aria-label={t("chat.toggleReaction", "Toggle {{emoji}} reaction", { emoji })}>{emoji} {count as number}</button>
                          ))}
                          <Popover>
                            <PopoverTrigger asChild><button className="text-muted-foreground hover:text-foreground p-1" aria-label={t("chat.addReaction", "Add reaction")}><Smile className="h-3 w-3" /></button></PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                              <div className="flex gap-1">{EMOJIS.map((emoji) => (<button key={emoji} onClick={() => addReactionMutation.mutate({ messageId: message.id, emoji })} className="text-lg hover:bg-muted rounded p-1" aria-label={t("chat.reactWith", "React with {{emoji}}", { emoji })}>{emoji}</button>))}</div>
                            </PopoverContent>
                          </Popover>
                          <button onClick={() => { setReportMessageId(message.id); setReportDialogOpen(true); }} className="text-muted-foreground hover:text-destructive p-1" aria-label={t("moderation.reportContent", "Report content")}><Flag className="h-3 w-3" /></button>
                          <span className="text-xs text-muted-foreground">{formatRelative(message.created_at)}</span>
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
              <label htmlFor="chat-input" className="sr-only">{t("chat.typeMessage", "Type a message...")}</label>
              <Input id="chat-input" aria-label={t("chat.messageInput", "Message input")} placeholder={t("chat.typeMessage", "Type a message...")} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
              <Button onClick={handleSend} disabled={!newMessage.trim() || sendMessageMutation.isPending || sendCooldown} aria-label={t("chat.sendMessage", "Send message")}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>

        {reportMessageId && (<ReportContentDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} contentType="chat_message" contentId={reportMessageId} />)}
      </div>
    </>
  );
}
