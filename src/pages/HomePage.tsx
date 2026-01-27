import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  Mic, 
  Headphones, 
  PenTool, 
  MessageCircle,
  GraduationCap,
  Users,
  Calendar
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    titleKey: 'categories.reading',
    descriptionKey: 'Read and comprehend Arabic texts',
  },
  {
    icon: PenTool,
    titleKey: 'categories.writing',
    descriptionKey: 'Practice writing in Arabic',
  },
  {
    icon: Headphones,
    titleKey: 'categories.listening',
    descriptionKey: 'Improve your listening skills',
  },
  {
    icon: Mic,
    titleKey: 'categories.speaking',
    descriptionKey: 'Develop your speaking abilities',
  },
  {
    icon: MessageCircle,
    titleKey: 'categories.grammar',
    descriptionKey: 'Master Arabic grammar rules',
  },
  {
    icon: GraduationCap,
    titleKey: 'nav.liveLessons',
    descriptionKey: 'Join live sessions with teachers',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="text-primary">{t('app.name')}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              {t('app.tagline')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button asChild size="lg">
                  <Link to="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/register">{t('auth.register')}</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/login">{t('auth.login')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t('nav.selfStudy')}</h2>
            <p className="mt-4 text-muted-foreground">
              Comprehensive Arabic learning covering all essential skills
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{t(feature.titleKey)}</CardTitle>
                  <CardDescription>{feature.descriptionKey}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Levels Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Three Learning Levels</h2>
            <p className="mt-4 text-muted-foreground">
              Progress through structured levels at your own pace
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { key: 'beginner', color: 'bg-green-500' },
              { key: 'intermediate', color: 'bg-blue-500' },
              { key: 'advanced', color: 'bg-purple-500' },
            ].map((level) => (
              <Card key={level.key} className="text-center">
                <CardHeader>
                  <div className={`h-3 w-24 mx-auto rounded-full ${level.color} mb-4`} />
                  <CardTitle>{t(`levels.${level.key}`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Structured curriculum with live lessons and self-study exercises
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-primary text-primary-foreground p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Start Your Arabic Journey Today
            </h2>
            <p className="mb-8 opacity-90">
              Join our community of learners and start speaking Arabic with confidence
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">{t('auth.register')}</Link>
            </Button>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
