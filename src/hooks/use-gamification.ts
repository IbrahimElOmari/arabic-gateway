import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiQuery, apiInvoke } from '@/lib/supabase-api';
import { useAuth } from '@/contexts/AuthContext';
import { UserPoints, UserBadge, Badge, LeaderboardEntry } from '@/types/gamification';

async function fetchPoints(userId: string): Promise<UserPoints | null> {
  return apiQuery<UserPoints | null>('user_points', (q) => 
    q.select('*').eq('user_id', userId).maybeSingle()
  );
}

async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  return apiQuery<UserBadge[]>('user_badges', (q) =>
    q.select(`*, badge:badges (*)`).eq('user_id', userId).order('earned_at', { ascending: false })
  );
}

async function fetchAllBadges(): Promise<Badge[]> {
  return apiQuery<Badge[]>('badges', (q) => 
    q.select('*').order('points_value', { ascending: true })
  );
}

async function fetchLeaderboardData(
  period: 'weekly' | 'monthly' | 'all_time',
  limit: number
): Promise<LeaderboardEntry[]> {
  if (period === 'all_time') {
    const pointsData = await apiQuery<Array<{ user_id: string; total_points: number }>>('user_points', (q) =>
      q.select('user_id, total_points').order('total_points', { ascending: false }).limit(limit)
    );

    if (!pointsData.length) return [];

    const userIds = pointsData.map(p => p.user_id);
    const profilesData = await apiQuery<Array<{ user_id: string; full_name: string; avatar_url: string | null }>>('profiles', (q) =>
      q.select('user_id, full_name, avatar_url').in('user_id', userIds)
    );

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

  const leaderboardRaw = await apiQuery<Array<{ user_id: string; points: number; rank: number }>>('leaderboards', (q) =>
    q.select('user_id, points, rank').eq('period', period).order('points', { ascending: false }).limit(limit)
  );

  if (!leaderboardRaw.length) return [];

  const userIds = leaderboardRaw.map(p => p.user_id);
  const profilesData = await apiQuery<Array<{ user_id: string; full_name: string; avatar_url: string | null }>>('profiles', (q) =>
    q.select('user_id, full_name, avatar_url').in('user_id', userIds)
  );

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
      await apiInvoke('gamification', { action: 'update_streak', userId: user.id });
    },
    onSuccess: invalidateAll,
  });

  const awardPointsMutation = useMutation({
    mutationFn: async (params: { action: string; pointsAmount: number; referenceId?: string; referenceType?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const response = await apiInvoke<{ success: boolean }>('gamification', {
        action: 'award_points',
        userId: user.id,
        pointsAction: params.action,
        points: params.pointsAmount,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
      });
      return response;
    },
    onSuccess: (data) => {
      if (data?.success) invalidateAll();
    },
  });

  const checkBadgesMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const response = await apiInvoke<{ newBadges: any[] }>('gamification', {
        action: 'check_badges', 
        userId: user.id 
      });
      return response.newBadges || [];
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
