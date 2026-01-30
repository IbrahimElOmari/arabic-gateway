import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '@/hooks/use-gamification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, Flame, Star, Medal, Crown, Target, Zap, 
  Moon, Sunrise, Heart, GraduationCap, Footprints, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  'footprints': Footprints,
  'graduation-cap': GraduationCap,
  'flame': Flame,
  'fire': Flame,
  'crown': Crown,
  'target': Target,
  'zap': Zap,
  'moon': Moon,
  'sunrise': Sunrise,
  'heart-handshake': Heart,
  'trophy': Trophy,
  'star': Star,
  'medal': Medal,
  'award': Award,
};

export function GamificationDashboard() {
  const { t, i18n } = useTranslation();
  const { 
    points, 
    badges, 
    allBadges, 
    leaderboard, 
    loading, 
    fetchLeaderboard,
    getRarityColor 
  } = useGamification();

  const getLocalizedName = (item: { name_nl: string; name_en: string; name_ar: string }) => {
    switch (i18n.language) {
      case 'ar': return item.name_ar;
      case 'en': return item.name_en;
      default: return item.name_nl;
    }
  };

  const getLocalizedDescription = (item: { description_nl: string; description_en: string; description_ar: string }) => {
    switch (i18n.language) {
      case 'ar': return item.description_ar;
      case 'en': return item.description_en;
      default: return item.description_nl;
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
    </div>;
  }

  const earnedBadgeIds = new Set(badges.map(b => b.badge_id));

  return (
    <div className="space-y-6">
      {/* Points & Streak Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('gamification.totalPoints')}
            </CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{points?.total_points || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('gamification.currentStreak')}
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{points?.current_streak || 0} {t('gamification.days')}</div>
            <p className="text-xs text-muted-foreground">
              {t('gamification.longestStreak')}: {points?.longest_streak || 0} {t('gamification.days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('gamification.badgesEarned')}
            </CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{badges.length} / {allBadges.length}</div>
            <Progress value={(badges.length / allBadges.length) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="badges">{t('gamification.badges')}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t('gamification.leaderboard')}</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('gamification.allBadges')}</CardTitle>
              <CardDescription>{t('gamification.badgesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allBadges.map((badge) => {
                  const earned = earnedBadgeIds.has(badge.id);
                  const IconComponent = iconMap[badge.icon] || Award;
                  
                  return (
                    <div
                      key={badge.id}
                      className={cn(
                        "flex flex-col items-center p-4 rounded-lg border transition-all",
                        earned 
                          ? "bg-card border-primary/20" 
                          : "bg-muted/50 border-transparent opacity-50"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-full mb-2",
                        earned ? "bg-primary/10" : "bg-muted"
                      )}>
                        <IconComponent className={cn(
                          "h-6 w-6",
                          earned ? getRarityColor(badge.rarity) : "text-muted-foreground"
                        )} />
                      </div>
                      <span className={cn(
                        "text-sm font-medium text-center",
                        !earned && "text-muted-foreground"
                      )}>
                        {getLocalizedName(badge)}
                      </span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {getLocalizedDescription(badge)}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn("mt-2", getRarityColor(badge.rarity))}
                      >
                        {badge.points_value} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('gamification.leaderboard')}</CardTitle>
                  <CardDescription>{t('gamification.leaderboardDescription')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => fetchLeaderboard('weekly')}
                  >
                    {t('gamification.weekly')}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => fetchLeaderboard('monthly')}
                  >
                    {t('gamification.monthly')}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => fetchLeaderboard('all_time')}
                  >
                    {t('gamification.allTime')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('gamification.noLeaderboardData')}
                  </p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg",
                        index === 0 && "bg-amber-100 dark:bg-amber-900/20",
                        index === 1 && "bg-slate-100 dark:bg-slate-800/50",
                        index === 2 && "bg-orange-100 dark:bg-orange-900/20",
                        index > 2 && "bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full font-bold",
                        index === 0 && "bg-amber-500 text-white",
                        index === 1 && "bg-slate-400 text-white",
                        index === 2 && "bg-orange-400 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {entry.profiles?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{entry.profiles?.full_name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="font-bold">{entry.points}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
