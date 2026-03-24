import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Smile, Loader2, Flag, ChevronUp, Plus, User, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { formatRelative } from "@/lib/date-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReportContentDialog } from "@/components/moderation/ReportContentDialog";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const EMOJIS = ["👍", "❤️", "😊", "🎉", "👏", "🙏", "💪", "✨"];
const MESSAGES_PER_PAGE = 50;
const SEND_COOLDOWN_MS = 1000;

// ─── Group Chat Tab ───
function GroupChatTab() {
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
    queryFn: () => apiQuery<any[]>("class_enrollments", (q) => q.select("class_id, class:classes(id, name)").eq("student_id", user!.id).eq("status", "enrolled")),
    enabled: !!user,
  });

  const { data: teacherClasses } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () => apiQuery<any[]>("classes", (q) => q.select("id, name").eq("teacher_id", user!.id)),
    enabled: !!user && role !== 'admin',
  });

  // Admins can see ALL classes
  const { data: adminClasses } = useQuery({
    queryKey: ["admin-all-classes"],
    queryFn: () => apiQuery<any[]>("classes", (q) => q.select("id, name").eq("is_active", true).order("name")),
    enabled: !!user && role === 'admin',
  });

  const allClasses = useMemo(() => {
    if (role === 'admin') return adminClasses || [];
    return [
      ...(enrollments?.map((e: any) => e.class) || []),
      ...(teacherClasses || []),
    ].filter((c, i, arr) => arr.findIndex((x: any) => x?.id === c?.id) === i);
  }, [enrollments, teacherClasses, adminClasses, role]);

  useEffect(() => {
    if (allClasses.length > 0 && !selectedClass) setSelectedClass(allClasses[0]?.id || null);
  }, [allClasses, selectedClass]);

  useEffect(() => { setOlderMessages([]); setHasMore(true); }, [selectedClass]);

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
    if (scrollRef.current && recentMessages) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

  const handleSend = () => { if (newMessage.trim() && !sendCooldown) sendMessageMutation.mutate(newMessage); };

  if (enrollmentsLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (allClasses.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{t("chat.noClasses")}</h3>
        <p className="text-muted-foreground">{t("chat.noClassesDescription", "Je moet ingeschreven zijn in een klas om de chat te gebruiken.")}</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {allClasses.map((cls: any) => (
          <Button key={cls?.id} variant={selectedClass === cls?.id ? "default" : "outline"} size="sm" onClick={() => setSelectedClass(cls?.id || null)}>{cls?.name}</Button>
        ))}
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> {allClasses.find((c: any) => c?.id === selectedClass)?.name}</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messagesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {hasMore && (
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" onClick={loadOlderMessages} disabled={loadingMore} aria-label={t("chat.loadOlder", "Oudere berichten laden")}>
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronUp className="h-4 w-4 mr-2" />}
                    {t("chat.loadOlder", "Oudere berichten laden")}
                  </Button>
                </div>
              )}
              {messages.map((message: any) => (
                <ChatBubble key={message.id} message={message} isOwn={message.sender_id === user?.id} onReaction={(messageId, emoji) => addReactionMutation.mutate({ messageId, emoji })} onReport={(id) => { setReportMessageId(id); setReportDialogOpen(true); }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("chat.noMessages")}</p>
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <label htmlFor="group-chat-input" className="sr-only">{t("chat.typeMessage")}</label>
            <Input id="group-chat-input" aria-label={t("chat.messageInput", "Berichtinvoer")} placeholder={t("chat.typeMessage")} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
            <Button onClick={handleSend} disabled={!newMessage.trim() || sendMessageMutation.isPending || sendCooldown} aria-label={t("chat.sendMessage", "Bericht versturen")}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
      {reportMessageId && <ReportContentDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} contentType="chat_message" contentId={reportMessageId} />}
    </div>
  );
}

// ─── Private Chat Tab ───
function PrivateChatTab() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get private chat rooms the user participates in
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["private-chat-rooms", user?.id],
    queryFn: async () => {
      const participants = await apiQuery<any[]>("private_chat_participants", (q) =>
        q.select("room_id").eq("user_id", user!.id)
      );
      if (!participants?.length) return [];
      const roomIds = participants.map((p: any) => p.room_id);
      const roomsData = await apiQuery<any[]>("private_chat_rooms", (q) =>
        q.select("*").in("id", roomIds).order("updated_at", { ascending: false })
      );
      // Enrich with other participant info
      const enriched = await Promise.all((roomsData || []).map(async (room: any) => {
        const parts = await apiQuery<any[]>("private_chat_participants", (q) =>
          q.select("user_id").eq("room_id", room.id)
        );
        const otherUserIds = parts?.filter((p: any) => p.user_id !== user!.id).map((p: any) => p.user_id) || [];
        let otherProfiles: any[] = [];
        if (otherUserIds.length > 0) {
          otherProfiles = await apiQuery<any[]>("profiles", (q) =>
            q.select("user_id, full_name, avatar_url").in("user_id", otherUserIds)
          ) || [];
        }
        return { ...room, participants: otherProfiles };
      }));
      return enriched;
    },
    enabled: !!user,
  });

  // Messages for selected room
  const { data: privateMessages, isLoading: pmLoading } = useQuery({
    queryKey: ["private-chat-messages", selectedRoom],
    queryFn: async () => {
      const msgs = await apiQuery<any[]>("private_chat_messages", (q) =>
        q.select("*").eq("room_id", selectedRoom!).order("created_at", { ascending: true }).limit(200)
      );
      const senderIds = [...new Set((msgs || []).map((m: any) => m.sender_id))];
      const profiles = senderIds.length > 0
        ? await apiQuery<any[]>("profiles", (q) => q.select("user_id, full_name, avatar_url").in("user_id", senderIds))
        : [];
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (msgs || []).map((m: any) => ({ ...m, sender: profileMap.get(m.sender_id) || null }));
    },
    enabled: !!selectedRoom,
  });

  // Realtime for private messages
  useEffect(() => {
    if (!selectedRoom) return;
    const channel = supabase
      .channel(`private-chat-${selectedRoom}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "private_chat_messages", filter: `room_id=eq.${selectedRoom}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["private-chat-messages", selectedRoom] });
        queryClient.invalidateQueries({ queryKey: ["private-chat-rooms", user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, queryClient, user?.id]);

  useEffect(() => {
    if (scrollRef.current && privateMessages) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [privateMessages]);

  const sendPrivateMessage = useMutation({
    mutationFn: async (content: string) => {
      await apiMutate("private_chat_messages", (q) =>
        q.insert({ room_id: selectedRoom!, sender_id: user!.id, content })
      );
      // Update room's updated_at
      await apiMutate("private_chat_rooms", (q) =>
        q.update({ updated_at: new Date().toISOString() }).eq("id", selectedRoom!)
      );
    },
    onSuccess: () => { setNewMessage(""); },
  });

  // Search users for new conversation
  const { data: searchResults } = useQuery({
    queryKey: ["search-users-chat", searchUser],
    queryFn: () => apiQuery<any[]>("profiles", (q) =>
      q.select("user_id, full_name, avatar_url, email").ilike("full_name", `%${searchUser}%`).neq("user_id", user!.id).limit(10)
    ),
    enabled: searchUser.length >= 2,
  });

  const startConversation = useMutation({
    mutationFn: async (targetUserId: string) => {
      // Check if room already exists between these two users
      const myRooms = await apiQuery<any[]>("private_chat_participants", (q) =>
        q.select("room_id").eq("user_id", user!.id)
      );
      for (const r of myRooms || []) {
        const otherInRoom = await apiQuery<any[]>("private_chat_participants", (q) =>
          q.select("user_id").eq("room_id", r.room_id).eq("user_id", targetUserId)
        );
        if (otherInRoom && otherInRoom.length > 0) {
          // Room exists, check it's a 1-on-1
          const allInRoom = await apiQuery<any[]>("private_chat_participants", (q) =>
            q.select("user_id").eq("room_id", r.room_id)
          );
          if (allInRoom && allInRoom.length === 2) {
            return r.room_id;
          }
        }
      }
      // Create new room
      const roomData = await apiMutate("private_chat_rooms", (q) =>
        q.insert({ is_group: false }).select("id").single()
      );
      const roomId = (roomData as any).id;
      await apiMutate("private_chat_participants", (q) =>
        q.insert([
          { room_id: roomId, user_id: user!.id },
          { room_id: roomId, user_id: targetUserId },
        ])
      );
      return roomId;
    },
    onSuccess: (roomId) => {
      setSelectedRoom(roomId);
      setNewChatDialogOpen(false);
      setSearchUser("");
      queryClient.invalidateQueries({ queryKey: ["private-chat-rooms", user?.id] });
    },
  });

  const handleSendPrivate = () => {
    if (newMessage.trim()) sendPrivateMessage.mutate(newMessage);
  };

  const getRoomDisplayName = (room: any) => {
    if (room.name) return room.name;
    return room.participants?.map((p: any) => p.full_name).join(", ") || t("chat.privateChat", "Privégesprek");
  };

  if (roomsLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Room list */}
      <div className="w-full md:w-72 shrink-0 space-y-2">
        <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full"><Plus className="h-4 w-4 mr-2" /> {t("chat.newConversation", "Nieuw gesprek")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("chat.startConversation", "Start een gesprek")}</DialogTitle></DialogHeader>
            <Input placeholder={t("chat.searchUser", "Zoek een gebruiker...")} value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searchResults?.map((profile: any) => (
                <button key={profile.user_id} onClick={() => startConversation.mutate(profile.user_id)} className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted text-left" disabled={startConversation.isPending}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback>{profile.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </button>
              ))}
              {searchUser.length >= 2 && (!searchResults || searchResults.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("chat.noUsersFound", "Geen gebruikers gevonden")}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <ScrollArea className="h-[calc(100vh-16rem)]">
          {rooms && rooms.length > 0 ? rooms.map((room: any) => (
            <button key={room.id} onClick={() => setSelectedRoom(room.id)} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left mb-1 transition-colors ${selectedRoom === room.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={room.participants?.[0]?.avatar_url || ""} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{getRoomDisplayName(room)}</span>
            </button>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t("chat.noConversations", "Geen gesprekken")}</p>
          )}
        </ScrollArea>
      </div>

      {/* Message area */}
      <Card className="flex-1 flex flex-col overflow-hidden min-h-[400px]">
        {selectedRoom ? (
          <>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {getRoomDisplayName(rooms?.find((r: any) => r.id === selectedRoom) || {})}
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {pmLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : privateMessages && privateMessages.length > 0 ? (
                <div className="space-y-3">
                  {privateMessages.map((msg: any) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && <span className="text-xs text-muted-foreground mb-1 block">{msg.sender?.full_name}</span>}
                          <div className={`rounded-lg px-4 py-2 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 block">{formatRelative(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("chat.noMessages")}</p>
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <label htmlFor="private-chat-input" className="sr-only">{t("chat.typeMessage")}</label>
                <Input id="private-chat-input" aria-label={t("chat.messageInput", "Berichtinvoer")} placeholder={t("chat.typeMessage")} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendPrivate()} />
                <Button onClick={handleSendPrivate} disabled={!newMessage.trim() || sendPrivateMessage.isPending} aria-label={t("chat.sendMessage", "Bericht versturen")}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center flex-1 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("chat.selectConversation", "Selecteer een gesprek of start een nieuw gesprek")}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ─── Shared Chat Bubble ───
function ChatBubble({ message, isOwn, onReaction, onReport }: { message: any; isOwn: boolean; onReaction: (id: string, emoji: string) => void; onReport: (id: string) => void }) {
  const { t } = useTranslation();
  const reactionGroups = message.reactions?.reduce((acc: Record<string, number>, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {}) || {};

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && <span className="text-xs text-muted-foreground mb-1 block">{message.sender?.full_name}</span>}
        <div className={`rounded-lg px-4 py-2 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="flex items-center gap-1 mt-1">
          {Object.entries(reactionGroups).map(([emoji, count]) => (
            <button key={emoji} onClick={() => onReaction(message.id, emoji)} className="text-xs bg-muted rounded-full px-2 py-0.5 hover:bg-muted/80" aria-label={t("chat.toggleReaction", "{{emoji}} reactie", { emoji })}>{emoji} {count as number}</button>
          ))}
          <Popover>
            <PopoverTrigger asChild><button className="text-muted-foreground hover:text-foreground p-1" aria-label={t("chat.addReaction", "Reactie toevoegen")}><Smile className="h-3 w-3" /></button></PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-1">{EMOJIS.map((emoji) => (<button key={emoji} onClick={() => onReaction(message.id, emoji)} className="text-lg hover:bg-muted rounded p-1" aria-label={t("chat.reactWith", "Reageer met {{emoji}}", { emoji })}>{emoji}</button>))}</div>
            </PopoverContent>
          </Popover>
          <button onClick={() => onReport(message.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label={t("moderation.reportContent")}><Flag className="h-3 w-3" /></button>
          <span className="text-xs text-muted-foreground">{formatRelative(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function ChatPage() {
  const { t } = useTranslation();

  return (
    <div className="container py-4 h-[calc(100vh-4rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-foreground mb-4">{t("chat.title")}</h1>
      <Tabs defaultValue="group" className="flex-1 flex flex-col">
        <TabsList className="mb-3">
          <TabsTrigger value="group" className="flex items-center gap-2"><Users className="h-4 w-4" /> {t("chat.groupChat", "Groepschat")}</TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-2"><User className="h-4 w-4" /> {t("chat.privateChat", "Privéchat")}</TabsTrigger>
        </TabsList>
        <TabsContent value="group" className="flex-1"><GroupChatTab /></TabsContent>
        <TabsContent value="private" className="flex-1"><PrivateChatTab /></TabsContent>
      </Tabs>
    </div>
  );
}
