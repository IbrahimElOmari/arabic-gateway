import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, LayoutDashboard, Save, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/admin/StatsCard";

const sidebarLinkClass =
  "relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:shadow-sm hover:shadow-md";

export default function DesignSystemPage() {
  const { t } = useTranslation();

  return (
    <main className="container space-y-8 py-6">
      <header className="space-y-2">
        <Badge variant="secondary" className="w-fit">{t('designSystemPage.sprint')}</Badge>
        <h1 className="text-3xl font-bold text-foreground">{t('designSystemPage.title')}</h1>
        <p className="max-w-3xl text-muted-foreground">
          {t('designSystemPage.description')}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('designSystemPage.buttonsTitle')}</CardTitle>
            <CardDescription>{t('designSystemPage.buttonsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button><Save className="h-4 w-4" />{t('designSystemPage.save')}</Button>
              <Button variant="secondary">{t('designSystemPage.secondary')}</Button>
              <Button variant="outline">{t('designSystemPage.outline')}</Button>
              <Button variant="destructive">{t('designSystemPage.delete')}</Button>
              <Button variant="ghost">{t('designSystemPage.ghost')}</Button>
              <Button variant="link">{t('designSystemPage.linkAction')}</Button>
              <Button disabled>{t('designSystemPage.disabled')}</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{t('designSystemPage.badgeDefault')}</Badge>
              <Badge variant="secondary">{t('designSystemPage.badgeDraft')}</Badge>
              <Badge variant="destructive">{t('designSystemPage.badgeAction')}</Badge>
              <Badge variant="outline">{t('designSystemPage.badgeOutline')}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label={t('designSystemPage.searchAriaLabel')} placeholder={t('designSystemPage.searchPlaceholder')} />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label={t('designSystemPage.quickSearchAriaLabel')} className="pl-9" placeholder={t('designSystemPage.quickSearchPlaceholder')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('designSystemPage.alertsTitle')}</CardTitle>
            <CardDescription>{t('designSystemPage.alertsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t('designSystemPage.successTitle')}</AlertTitle>
              <AlertDescription>{t('designSystemPage.successDescription')}</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('designSystemPage.checkRequiredTitle')}</AlertTitle>
              <AlertDescription>{t('designSystemPage.checkRequiredDescription')}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('designSystemPage.widgetsTitle')}</h2>
          <p className="text-muted-foreground">{t('designSystemPage.widgetsDescription')}</p>
        </div>
        <div className="grid gap-4 rounded-xl border border-transparent p-1 shadow-md sm:grid-cols-2 sm:border-accent/40 sm:shadow-lg lg:grid-cols-4 lg:border-accent lg:shadow-xl">
          <StatsCard title={t('designSystemPage.statUsers')} value={1280} icon={Users} description={t('designSystemPage.statUsersDesc')} trend={{ value: 12, isPositive: true }} />
          <StatsCard title={t('designSystemPage.statDashboard')} value="98%" icon={LayoutDashboard} description={t('designSystemPage.statDashboardDesc')} />
          <StatsCard title={t('designSystemPage.statEnrollments')} value={42} icon={CheckCircle2} description={t('designSystemPage.statEnrollmentsDesc')} />
          <StatsCard title={t('designSystemPage.statActionRequired')} value={7} icon={AlertCircle} description={t('designSystemPage.statActionRequiredDesc')} trend={{ value: 3, isPositive: false }} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('designSystemPage.sidebarTitle')}</CardTitle>
            <CardDescription>{t('designSystemPage.sidebarDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="#" className={sidebarLinkClass}><LayoutDashboard className="h-5 w-5" />{t('designSystemPage.sidebarDashboard')}</a>
            <a href="#" className={`${sidebarLinkClass} bg-sidebar-accent text-sidebar-accent-foreground font-medium`}><Users className="h-5 w-5" />{t('designSystemPage.sidebarUsers')}</a>
            <a href="#" className={`${sidebarLinkClass} justify-center px-2 sm:w-12`} aria-label={t('designSystemPage.sidebarCollapsedAria')}><LayoutDashboard className="h-5 w-5" /></a>
          </CardContent>
        </Card>

        <Card dir="rtl" lang="ar" className="font-sans">
          <CardHeader>
            <CardTitle>{t('designSystemPage.arabicPreviewTitle')}</CardTitle>
            <CardDescription>{t('designSystemPage.arabicPreviewDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="#" className={`${sidebarLinkClass} bg-sidebar-accent text-sidebar-accent-foreground font-medium`}><LayoutDashboard className="h-5 w-5" />{t('designSystemPage.arabicDashboard')}</a>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label={t('designSystemPage.arabicSearchAriaLabel')} placeholder={t('designSystemPage.arabicSearchPlaceholder')} />
              <Button><Save className="h-4 w-4" />{t('designSystemPage.arabicSave')}</Button>
            </div>
            <StatsCard title={t('designSystemPage.arabicTotalUsers')} value={1280} icon={Users} description={t('designSystemPage.arabicTotalUsersDesc')} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
