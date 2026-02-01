import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  HelpCircle, 
  Rocket, 
  User, 
  Calendar, 
  BookOpen, 
  CreditCard, 
  Wrench,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ElementType> = {
  "help-circle": HelpCircle,
  "rocket": Rocket,
  "user": User,
  "calendar": Calendar,
  "book-open": BookOpen,
  "credit-card": CreditCard,
  "wrench": Wrench,
};

export default function KnowledgeBasePage() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["faq-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["faq-articles", selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("faq_articles")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      if (searchQuery) {
        const lang = i18n.language;
        const searchLower = searchQuery.toLowerCase();
        return data.filter((article) => {
          const title = lang === "nl" ? article.title_nl : lang === "ar" ? article.title_ar : article.title_en;
          const content = lang === "nl" ? article.content_nl : lang === "ar" ? article.content_ar : article.content_en;
          return title.toLowerCase().includes(searchLower) || content.toLowerCase().includes(searchLower);
        });
      }

      return data;
    },
  });

  const getCategoryName = (category: any) => {
    const lang = i18n.language;
    if (lang === "nl") return category.name_nl;
    if (lang === "ar") return category.name_ar;
    return category.name_en;
  };

  const getArticleTitle = (article: any) => {
    const lang = i18n.language;
    if (lang === "nl") return article.title_nl;
    if (lang === "ar") return article.title_ar;
    return article.title_en;
  };

  const getArticleContent = (article: any) => {
    const lang = i18n.language;
    if (lang === "nl") return article.content_nl;
    if (lang === "ar") return article.content_ar;
    return article.content_en;
  };

  const handleFeedback = async (articleId: string, helpful: boolean) => {
    const { error } = await supabase
      .from("faq_articles")
      .update({
        [helpful ? "helpful_count" : "not_helpful_count"]: articles?.find((a) => a.id === articleId)?.[helpful ? "helpful_count" : "not_helpful_count"] + 1,
      })
      .eq("id", articleId);

    if (!error) {
      toast({
        title: t("faq.feedbackThanks", "Thank you!"),
        description: t("faq.feedbackReceived", "Your feedback has been recorded."),
      });
    }
  };

  const isLoading = categoriesLoading || articlesLoading;

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("faq.title", "Knowledge Base")}
          </h1>
          <p className="text-muted-foreground">
            {t("faq.description", "Find answers to frequently asked questions")}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mb-8">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("faq.searchPlaceholder", "Search for answers...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            {t("common.all", "All")}
          </Button>
          {categories?.map((category) => {
            const Icon = iconMap[category.icon] || HelpCircle;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {getCategoryName(category)}
              </Button>
            );
          })}
        </div>

        {/* Articles */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articles && articles.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {articles.map((article) => (
                  <AccordionItem key={article.id} value={article.id}>
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                        <span className="font-medium">{getArticleTitle(article)}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="pl-8">
                        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                          <p className="whitespace-pre-wrap">{getArticleContent(article)}</p>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">
                            {t("faq.wasHelpful", "Was this helpful?")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {t("common.yes", "Yes")} ({article.helpful_count})
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(article.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            {t("common.no", "No")} ({article.not_helpful_count})
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("faq.noResults", "No articles found")}
              </h3>
              <p className="text-muted-foreground">
                {t("faq.noResultsDescription", "Try adjusting your search or browse all categories")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t("faq.stillNeedHelp", "Still need help?")}</CardTitle>
            <CardDescription>
              {t("faq.contactSupport", "Our support team is here to assist you")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/helpdesk">{t("faq.openTicket", "Open a Support Ticket")}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
