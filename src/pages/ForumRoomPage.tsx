import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Plus, ThumbsUp, Pin, Lock, Loader2, ArrowLeft, Flag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatRelative } from "@/lib/date-utils";
import { ReportContentDialog } from "@/components/moderation/ReportContentDialog";

export default function ForumRoomPage() {
  const { roomName } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "forum_post"; id: string } | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["forum-room", roomName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_rooms")
        .select("*")
        .eq("name", roomName)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomName,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts", room?.id, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: postsResult, error, count } = await supabase
        .from("forum_posts")
        .select("*", { count: "exact" })
        .eq("room_id", room!.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      
      // Fetch author profiles separately
      const authorIds = [...new Set(postsResult.map(p => p.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch comment counts per post
      const postIds = postsResult.map(p => p.id);
      const commentCountMap = new Map<string, number>();
      if (postIds.length > 0) {
        const { data: comments } = await supabase
          .from("forum_comments")
          .select("post_id")
          .in("post_id", postIds);
        if (comments) {
          for (const c of comments) {
            commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
          }
        }
      }

      const posts = postsResult.map(post => ({
        ...post,
        author: profileMap.get(post.author_id) || null,
        comments_count: commentCountMap.get(post.id) || 0,
      }));
      return { posts, totalCount: count ?? 0 };
    },
    enabled: !!room?.id,
  });

  const posts = postsData?.posts;
  const totalPages = postsData ? Math.ceil(postsData.totalCount / PAGE_SIZE) : 0;

  const { data: userLikes } = useQuery({
    queryKey: ["forum-user-likes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_likes")
        .select("post_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map(l => l.post_id);
    },
    enabled: !!user,
  });

  const createPostMutation = useMutation({
    mutationFn: async (post: { title: string; content: string }) => {
      const { error } = await supabase.from("forum_posts").insert({
        room_id: room!.id,
        author_id: user!.id,
        title: post.title,
        content: post.content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts", room?.id] });
      setIsDialogOpen(false);
      setNewPost({ title: "", content: "" });
      toast({ title: t("forum.postCreated", "Post created successfully") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const isLiked = userLikes?.includes(postId);
      if (isLiked) {
        await supabase.from("forum_likes").delete().eq("user_id", user!.id).eq("post_id", postId);
        await supabase.from("forum_posts").update({ likes_count: (posts?.find(p => p.id === postId)?.likes_count || 1) - 1 }).eq("id", postId);
      } else {
        await supabase.from("forum_likes").insert({ user_id: user!.id, post_id: postId });
        await supabase.from("forum_posts").update({ likes_count: (posts?.find(p => p.id === postId)?.likes_count || 0) + 1 }).eq("id", postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts", room?.id] });
      queryClient.invalidateQueries({ queryKey: ["forum-user-likes", user?.id] });
    },
  });

  const getRoomName = () => {
    if (!room) return "";
    const lang = i18n.language;
    if (lang === "nl") return room.name_nl;
    if (lang === "ar") return room.name_ar;
    return room.name_en;
  };

  const isLoading = roomLoading || postsLoading;

  return (
    <>
      <div className="container py-8">
        <div className="mb-6">
          <Link to="/forum" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{getRoomName()}</h1>
              <p className="text-muted-foreground">{room?.description}</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("forum.newPost", "New Post")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("forum.createPost", "Create New Post")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder={t("forum.postTitle", "Post title")}
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                  <Textarea
                    placeholder={t("forum.postContent", "Write your post...")}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={6}
                  />
                  <Button
                    onClick={() => createPostMutation.mutate(newPost)}
                    disabled={!newPost.title || !newPost.content || createPostMutation.isPending}
                    className="w-full"
                  >
                    {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("common.submit")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link key={post.id} to={`/forum/${roomName}/${post.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">
                            {post.author?.full_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {post.title}
                            {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                            {post.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </CardTitle>
                          <CardDescription>
                            {post.author?.full_name} · {formatRelative(post.created_at)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            likeMutation.mutate(post.id);
                          }}
                          className={userLikes?.includes(post.id) ? "text-primary" : "text-muted-foreground"}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {post.likes_count}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReportTarget({ type: "forum_post", id: post.id });
                            setReportDialogOpen(true);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title={t("moderation.reportContent", "Report content")}
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  {t("common.previous", "Previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("common.pageOf", "Page {{current}} of {{total}}", { current: page + 1, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t("common.next", "Next")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("forum.noPosts", "No posts yet")}</h3>
              <p className="text-muted-foreground">{t("forum.beFirst", "Be the first to start a discussion!")}</p>
            </CardContent>
          </Card>
        )}

        {/* Report Dialog */}
        {reportTarget && (
          <ReportContentDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            contentType={reportTarget.type}
            contentId={reportTarget.id}
          />
        )}
      </div>
    </>
  );
}
