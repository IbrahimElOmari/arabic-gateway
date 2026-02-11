import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Calendar, TrendingUp, Flame, Trophy, MessageCircle, Shield, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user, profile, role } = useAuth();

  const isStaff = role === 'admin' || role === 'teacher';

  const { data: attempts } = useQuery({
    queryKey: ['my-attempts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('id, passed, time_spent_seconds')
        .eq('student_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: userPoints } = useQuery({
    queryKey: ['my-points', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalExercises = attempts?.length || 0;
  const passedExercises = attempts?.filter(a => a.passed)?.length || 0;
  const overallProgress = totalExercises > 0 ? Math.round((passedExercises / totalExercises) * 100) : 0;
  const studyHours = Math.round((attempts?.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0) || 0) / 3600);

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('dashboard.welcome')}, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1">{role && t(`roles.${role}`)}</p>
        </div>

        {/* Admin/Teacher fallback: show quick links to management panels */}
        {isStaff && (
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Shield className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                {role === 'admin'
                  ? t('dashboard.adminFallback', 'Je bent ingelogd als beheerder.')
                  : t('dashboard.teacherFallback', 'Je bent ingelogd als leerkracht.')}
              </span>
              <Button size="sm" asChild>
                <Link to={role === 'admin' ? '/admin' : '/teacher'}>
                  <Shield className="h-4 w-4 mr-1" />
                  {role === 'admin' ? t('nav.adminPanel', 'Beheerderspaneel') : t('teacher.dashboard', 'Docenten Dashboard')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/teacher/content-studio">
                  <Palette className="h-4 w-4 mr-1" />
                  {t('nav.contentStudio', 'Content Studio')}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.overallProgress')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallProgress}%</div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.exercisesDone')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{passedExercises}</div>
              <p className="text-xs text-muted-foreground">{t('common.of')} {totalExercises} {t('common.total')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('gamification.currentStreak')}</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userPoints?.current_streak || 0} {t('gamification.days')}</div>
              <p className="text-xs text-muted-foreground">{t('gamification.longestStreak')}: {userPoints?.longest_streak || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('gamification.totalPoints')}</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userPoints?.total_points || 0}</div>
              <p className="text-xs text-muted-foreground">{studyHours}h {t('dashboard.studyTime').toLowerCase()}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.quickActions', 'Quick Actions')}</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link to="/self-study" className="flex flex-col items-center gap-2">
                <BookOpen className="h-6 w-6" /><span>{t('nav.selfStudy')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link to="/live-lessons" className="flex flex-col items-center gap-2">
                <Calendar className="h-6 w-6" /><span>{t('nav.liveLessons')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link to="/gamification" className="flex flex-col items-center gap-2">
                <Trophy className="h-6 w-6" /><span>{t('nav.gamification', 'Gamification')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link to="/forum" className="flex flex-col items-center gap-2">
                <MessageCircle className="h-6 w-6" /><span>{t('nav.forum')}</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
