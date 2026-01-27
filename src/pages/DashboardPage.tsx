import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  PenTool, 
  Headphones, 
  Mic, 
  MessageCircle,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react';

const categories = [
  { key: 'reading', icon: BookOpen, progress: 45, color: 'text-blue-500' },
  { key: 'writing', icon: PenTool, progress: 30, color: 'text-green-500' },
  { key: 'listening', icon: Headphones, progress: 60, color: 'text-purple-500' },
  { key: 'speaking', icon: Mic, progress: 25, color: 'text-orange-500' },
  { key: 'grammar', icon: MessageCircle, progress: 55, color: 'text-pink-500' },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const { profile, role } = useAuth();

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {t('dashboard.welcome')}, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {role && t(`roles.${role}`)}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Stats Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">43%</div>
              <Progress value={43} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Exercises Done</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">of 56 total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next Lesson</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Wed</div>
              <p className="text-xs text-muted-foreground">19:00 - 20:30</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12h</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress by Category */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.yourProgress')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => (
              <Card key={category.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                    <CardTitle className="text-sm">
                      {t(`categories.${category.key}`)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{category.progress}%</div>
                  <Progress value={category.progress} className="mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Lessons */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.upcomingLessons')}</h2>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground py-8">
                No upcoming lessons scheduled. Check back later!
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Exercises */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.recentExercises')}</h2>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground py-8">
                Start your first exercise to see your activity here!
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
