import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Badge {
  id: string;
  badge_type: string;
  name_nl: string;
  name_en: string;
  name_ar: string;
  description_nl: string;
  description_en: string;
  description_ar: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points_value: number;
  requirement_value: number | null;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  is_displayed: boolean;
  badge: Badge;
}

interface UserPoints {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  exercises_completed: number;
  lessons_attended: number;
  perfect_scores: number;
}

interface LeaderboardEntry {
  user_id: string;
  points: number;
  rank: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

async function fetchPoints(userId: string): Promise<UserPoints | null> {
  const { data } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const { data } = await supabase
    .from('user_badges')
    .select(`*, badge:badges (*)`)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return data || [];
}

async function fetchAllBadges(): Promise<Badge[]> {
  const { data } = await supabase
    .from('badges')
    .select('*')
    .order('points_value', { ascending: true });
  return data || [];
}

async function fetchLeaderboardData(
  period: 'weekly' | 'monthly' | 'all_time',
  limit: number
): Promise<LeaderboardEntry[]> {
  if (period === 'all_time') {
    const { data: pointsData } = await supabase
      .from('user_points')
      .select('user_id, total_points')
      .order('total_points', { ascending: false })
      .limit(limit);

    if (!pointsData) return [];

    const userIds = pointsData.map(p => p.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profilesMap = new Map(
      (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );

    return pointsData.map((entry, index) => ({
      user_id: entry.user_id,
      points: entry.total_points,
      rank: index + 1,
      profiles: profilesMap.get(entry.user_id) || { full_name: 'Unknown', avatar_url: null },
    }));
  }

  const { data: leaderboardRaw } = await supabase
    .from('leaderboards')
    .select('user_id, points, rank')
    .eq('period', period)
    .order('points', { ascending: false })
    .limit(limit);

  if (!leaderboardRaw) return [];

  const userIds = leaderboardRaw.map(p => p.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds);

  const profilesMap = new Map(
    (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
  );

  return leaderboardRaw.map((entry) => ({
    user_id: entry.user_id,
    points: entry.points,
    rank: entry.rank || 0,
    profiles: profilesMap.get(entry.user_id) || { full_name: 'Unknown', avatar_url: null },
  }));
}

export function useGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: points = null, isLoading: pointsLoading } = useQuery({
    queryKey: ['gamification', 'points', userId],
    queryFn: () => fetchPoints(userId!),
    enabled: !!userId,
  });

  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['gamification', 'badges', userId],
    queryFn: () => fetchUserBadges(userId!),
    enabled: !!userId,
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ['gamification', 'allBadges'],
    queryFn: fetchAllBadges,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['gamification', 'leaderboard', 'weekly'],
    queryFn: () => fetchLeaderboardData('weekly', 10),
    enabled: !!userId,
  });

  const loading = pointsLoading || badgesLoading;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['gamification'] });
  }, [queryClient]);

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: sessionData } = await supabase.auth.getSession();
      await supabase.functions.invoke('gamification', {
        body: { action: 'update_streak', userId: user.id },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
    },
    onSuccess: invalidateAll,
  });

  const awardPointsMutation = useMutation({
    mutationFn: async (params: { action: string; pointsAmount: number; referenceId?: string; referenceType?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('gamification', {
        body: {
          action: 'award_points',
          userId: user.id,
          pointsAction: params.action,
          points: params.pointsAmount,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
        },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success) invalidateAll();
    },
  });

  const checkBadgesMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('gamification', {
        body: { action: 'check_badges', userId: user.id },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      return response.data?.newBadges || [];
    },
    onSuccess: (newBadges) => {
      if (newBadges?.length > 0) invalidateAll();
    },
  });

  const fetchLeaderboard = useCallback(async (
    period: 'weekly' | 'monthly' | 'all_time' = 'weekly',
    limit: number = 10
  ) => {
    queryClient.setQueryData(
      ['gamification', 'leaderboard', period],
      undefined
    );
    queryClient.invalidateQueries({
      queryKey: ['gamification', 'leaderboard', period],
    });
  }, [queryClient]);

  const updateStreak = () => updateStreakMutation.mutateAsync();

  const awardPoints = (action: string, pointsAmount: number, referenceId?: string, referenceType?: string) =>
    awardPointsMutation.mutateAsync({ action, pointsAmount, referenceId, referenceType });

  const checkBadges = () => checkBadgesMutation.mutateAsync();

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-muted-foreground';
      case 'rare':
        return 'text-accent';
      case 'epic':
        return 'text-primary';
      case 'legendary':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  return {
    points,
    badges,
    allBadges,
    leaderboard,
    loading,
    updateStreak,
    awardPoints,
    checkBadges,
    fetchLeaderboard,
    refresh: invalidateAll,
    getRarityColor,
  };
}