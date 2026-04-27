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
  return (
    <main className="container space-y-8 py-6">
      <header className="space-y-2">
        <Badge variant="secondary" className="w-fit">Sprint 1</Badge>
        <h1 className="text-3xl font-bold text-foreground">Design System Showcase</h1>
        <p className="max-w-3xl text-muted-foreground">
          Visuele controlepagina voor kerncomponenten, states, mobile spacing en Arabic/RTL-weergave.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Buttons, badges en inputs</CardTitle>
            <CardDescription>Light-mode contrast, focus rings, hover states en disabled states.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button><Save className="h-4 w-4" />Opslaan</Button>
              <Button variant="secondary">Secundair</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Verwijderen</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link actie</Button>
              <Button disabled>Uitgeschakeld</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Standaard</Badge>
              <Badge variant="secondary">Concept</Badge>
              <Badge variant="destructive">Actie nodig</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label="Zoeken" placeholder="Zoek studenten, lessen of betalingen" />
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Zoeken met icoon" className="pl-9" placeholder="Snelle zoekactie" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Statusmeldingen met semantische tokens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Succesvol opgeslagen</AlertTitle>
              <AlertDescription>De wijzigingen zijn klaar voor review.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Controle vereist</AlertTitle>
              <AlertDescription>Deze flow bevat nog openstaande validatie.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Admin dashboard widgets</h2>
          <p className="text-muted-foreground">Responsieve stats cards met keyboard focus en compacte mobile padding.</p>
        </div>
        <div className="grid gap-4 rounded-xl border border-transparent p-1 shadow-md sm:grid-cols-2 sm:border-accent/40 sm:shadow-lg lg:grid-cols-4 lg:border-accent lg:shadow-xl">
          <StatsCard title="Gebruikers" value={1280} icon={Users} description="Geregistreerde gebruikers" trend={{ value: 12, isPositive: true }} />
          <StatsCard title="Dashboard" value="98%" icon={LayoutDashboard} description="Gezonde sessies" />
          <StatsCard title="Inschrijvingen" value={42} icon={CheckCircle2} description="Deze week verwerkt" />
          <StatsCard title="Actie nodig" value={7} icon={AlertCircle} description="Openstaande controles" trend={{ value: 3, isPositive: false }} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sidebar states</CardTitle>
            <CardDescription>Default, hover/focus-contract en active state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="#" className={sidebarLinkClass}><LayoutDashboard className="h-5 w-5" />Dashboard</a>
            <a href="#" className={`${sidebarLinkClass} bg-sidebar-accent text-sidebar-accent-foreground font-medium`}><Users className="h-5 w-5" />Gebruikers</a>
            <a href="#" className={`${sidebarLinkClass} justify-center px-2 sm:w-12`} aria-label="Collapsed dashboard"><LayoutDashboard className="h-5 w-5" /></a>
          </CardContent>
        </Card>

        <Card dir="rtl" lang="ar" className="font-sans">
          <CardHeader>
            <CardTitle>معاينة عربية</CardTitle>
            <CardDescription>اختبار الاتجاه، المسافات، المحاذاة والطباعة العربية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="#" className={`${sidebarLinkClass} bg-sidebar-accent text-sidebar-accent-foreground font-medium`}><LayoutDashboard className="h-5 w-5" />لوحة التحكم</a>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label="بحث عربي" placeholder="ابحث عن طالب أو درس" />
              <Button><Save className="h-4 w-4" />حفظ التغييرات</Button>
            </div>
            <StatsCard title="إجمالي المستخدمين" value={1280} icon={Users} description="المستخدمون المسجلون" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}