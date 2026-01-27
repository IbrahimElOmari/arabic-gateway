import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, Pin, Lock, Loader2, ArrowLeft, Trash, Edit, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function ForumPostPage() {
  const { roomName, postId } = useParams();
  const { t } = useTranslation();
  const { user, isAdmin, isTeacher } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["forum-post", postId],
    queryFn: async () => {
      const { data: postData, error } = await supabase
        .from("forum_posts")
        .select("*, room:forum_rooms(name, name_en, name_nl, name_ar)")
        .eq("id", postId)
        .single();
      if (error) throw error;
      
      // Fetch author profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", postData.author_id)
        .maybeSingle();
      
      return { ...postData, author: profile };
    },
    enabled: !!postId,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["forum-comments", postId],
    queryFn: async () => {
      const { data: commentsData, error } = await supabase
        .from("forum_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      // Fetch author profiles
      const authorIds = [...new Set(commentsData.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return commentsData.map(comment => ({
        ...comment,
        author: profileMap.get(comment.author_id) || null,
      }));
    },
    enabled: !!postId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("forum_comments").insert({
        post_id: postId,
        author_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-comments", postId] });
      setNewComment("");
      toast({ title: t("forum.commentAdded", "Comment added") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("forum.postDeleted", "Post deleted") });
      navigate(`/forum/${roomName}`);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-comments", postId] });
      toast({ title: t("forum.commentDeleted", "Comment deleted") });
    },
  });

  const canDeletePost = post?.author_id === user?.id || isAdmin || isTeacher;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!post) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p>{t("forum.postNotFound", "Post not found")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        <Link to={`/forum/${roomName}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">
                    {post.author?.full_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {post.title}
                    {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                    {post.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                  <CardDescription>
                    {post.author?.full_name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
              </div>
              {canDeletePost && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePostMutation.mutate()}
                  className="text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <span className="text-muted-foreground flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                {post.likes_count} {t("forum.likes", "likes")}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {t("forum.comments", "Comments")} ({comments?.length || 0})
          </h3>

          {!post.is_locked && (
            <div className="flex gap-2">
              <Textarea
                placeholder={t("forum.writeComment", "Write a comment...")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={() => addCommentMutation.mutate(newComment)}
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <span className="text-sm font-medium">
                            {comment.author?.full_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.author?.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                      {(comment.author_id === user?.id || isAdmin || isTeacher) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t("forum.noComments", "No comments yet")}
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
