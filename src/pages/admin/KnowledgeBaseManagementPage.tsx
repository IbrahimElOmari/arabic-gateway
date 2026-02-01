import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function KnowledgeBaseManagementPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState({
    category_id: "",
    title_nl: "",
    title_en: "",
    title_ar: "",
    content_nl: "",
    content_en: "",
    content_ar: "",
    is_published: true,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-faq-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-faq-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_articles")
        .select("*, category:faq_categories(name_nl, name_en, name_ar)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (form: typeof articleForm) => {
      const { error } = await supabase.from("faq_articles").insert({
        ...form,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-articles"] });
      setShowArticleDialog(false);
      resetForm();
      toast({
        title: t("admin.articleCreated", "Article Created"),
        description: t("admin.articleCreatedDescription", "The FAQ article has been created successfully."),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.articleCreateError", "Failed to create article."),
      });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: typeof articleForm }) => {
      const { error } = await supabase.from("faq_articles").update(form).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-articles"] });
      setShowArticleDialog(false);
      setEditingArticle(null);
      resetForm();
      toast({
        title: t("admin.articleUpdated", "Article Updated"),
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-articles"] });
      toast({
        title: t("admin.articleDeleted", "Article Deleted"),
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase.from("faq_articles").update({ is_published: isPublished }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-articles"] });
    },
  });

  const resetForm = () => {
    setArticleForm({
      category_id: "",
      title_nl: "",
      title_en: "",
      title_ar: "",
      content_nl: "",
      content_en: "",
      content_ar: "",
      is_published: true,
    });
  };

  const openEditDialog = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      category_id: article.category_id,
      title_nl: article.title_nl,
      title_en: article.title_en,
      title_ar: article.title_ar,
      content_nl: article.content_nl,
      content_en: article.content_en,
      content_ar: article.content_ar,
      is_published: article.is_published,
    });
    setShowArticleDialog(true);
  };

  const handleSubmit = () => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, form: articleForm });
    } else {
      createArticleMutation.mutate(articleForm);
    }
  };

  const getCategoryName = (category: any) => {
    const lang = i18n.language;
    if (lang === "nl") return category?.name_nl;
    if (lang === "ar") return category?.name_ar;
    return category?.name_en;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.knowledgeBase", "Knowledge Base")}</h1>
          <p className="text-muted-foreground">
            {t("admin.knowledgeBaseDescription", "Manage FAQ articles and categories")}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingArticle(null); setShowArticleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t("admin.addArticle", "Add Article")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.title", "Title")}</TableHead>
                <TableHead>{t("admin.category", "Category")}</TableHead>
                <TableHead>{t("admin.status", "Status")}</TableHead>
                <TableHead>{t("admin.views", "Views")}</TableHead>
                <TableHead>{t("admin.feedback", "Feedback")}</TableHead>
                <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : articles && articles.length > 0 ? (
                articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title_en}</TableCell>
                    <TableCell>{getCategoryName(article.category)}</TableCell>
                    <TableCell>
                      <Badge variant={article.is_published ? "default" : "secondary"}>
                        {article.is_published ? t("common.published", "Published") : t("common.draft", "Draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.view_count}</TableCell>
                    <TableCell>
                      <span className="text-green-600">+{article.helpful_count}</span>
                      {" / "}
                      <span className="text-red-600">-{article.not_helpful_count}</span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublishMutation.mutate({ id: article.id, isPublished: !article.is_published })}
                      >
                        {article.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(article)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteArticleMutation.mutate(article.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("admin.noArticles", "No articles yet")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Article Dialog */}
      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? t("admin.editArticle", "Edit Article") : t("admin.addArticle", "Add Article")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("admin.category", "Category")}</Label>
              <Select value={articleForm.category_id} onValueChange={(v) => setArticleForm({ ...articleForm, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectCategory", "Select category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="en" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="nl">Nederlands</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label>{t("admin.title", "Title")} (EN)</Label>
                  <Input value={articleForm.title_en} onChange={(e) => setArticleForm({ ...articleForm, title_en: e.target.value })} />
                </div>
                <div>
                  <Label>{t("admin.content", "Content")} (EN)</Label>
                  <Textarea rows={6} value={articleForm.content_en} onChange={(e) => setArticleForm({ ...articleForm, content_en: e.target.value })} />
                </div>
              </TabsContent>
              <TabsContent value="nl" className="space-y-4">
                <div>
                  <Label>{t("admin.title", "Title")} (NL)</Label>
                  <Input value={articleForm.title_nl} onChange={(e) => setArticleForm({ ...articleForm, title_nl: e.target.value })} />
                </div>
                <div>
                  <Label>{t("admin.content", "Content")} (NL)</Label>
                  <Textarea rows={6} value={articleForm.content_nl} onChange={(e) => setArticleForm({ ...articleForm, content_nl: e.target.value })} />
                </div>
              </TabsContent>
              <TabsContent value="ar" className="space-y-4" dir="rtl">
                <div>
                  <Label>{t("admin.title", "Title")} (AR)</Label>
                  <Input value={articleForm.title_ar} onChange={(e) => setArticleForm({ ...articleForm, title_ar: e.target.value })} />
                </div>
                <div>
                  <Label>{t("admin.content", "Content")} (AR)</Label>
                  <Textarea rows={6} value={articleForm.content_ar} onChange={(e) => setArticleForm({ ...articleForm, content_ar: e.target.value })} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2">
              <Switch
                checked={articleForm.is_published}
                onCheckedChange={(checked) => setArticleForm({ ...articleForm, is_published: checked })}
              />
              <Label>{t("admin.publishImmediately", "Publish immediately")}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArticleDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
            >
              {(createArticleMutation.isPending || updateArticleMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingArticle ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
