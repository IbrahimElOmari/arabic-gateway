import { useCallback, useEffect, useState } from 'react';
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

export function useGamification() {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setPoints(pointsData);

      // Fetch user badges with badge details
      const { data: userBadgesData } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges (*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      setBadges(userBadgesData || []);

      // Fetch all available badges
      const { data: allBadgesData } = await supabase
        .from('badges')
        .select('*')
        .order('points_value', { ascending: true });

      setAllBadges(allBadgesData || []);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async (
    period: 'weekly' | 'monthly' | 'all_time' = 'weekly',
    limit: number = 10
  ) => {
    try {
      // For simplicity, we'll use user_points for all-time leaderboard
      if (period === 'all_time') {
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('user_id, total_points')
          .order('total_points', { ascending: false })
          .limit(limit);

        if (!pointsData) {
          setLeaderboard([]);
          return;
        }

        // Fetch profiles separately
        const userIds = pointsData.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const leaderboardData = pointsData.map((entry, index) => ({
          user_id: entry.user_id,
          points: entry.total_points,
          rank: index + 1,
          profiles: profilesMap.get(entry.user_id) || { full_name: 'Unknown', avatar_url: null },
        }));

        setLeaderboard(leaderboardData);
      } else {
        const { data: leaderboardRaw } = await supabase
          .from('leaderboards')
          .select('user_id, points, rank')
          .eq('period', period)
          .order('points', { ascending: false })
          .limit(limit);

        if (!leaderboardRaw) {
          setLeaderboard([]);
          return;
        }

        // Fetch profiles separately
        const userIds = leaderboardRaw.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const leaderboardData = leaderboardRaw.map((entry) => ({
          user_id: entry.user_id,
          points: entry.points,
          rank: entry.rank || 0,
          profiles: profilesMap.get(entry.user_id) || { full_name: 'Unknown', avatar_url: null },
        }));

        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchLeaderboard();
  }, [fetchUserData, fetchLeaderboard]);

  const updateStreak = async () => {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      await supabase.functions.invoke('gamification', {
        body: { action: 'update_streak', userId: user.id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });
      await fetchUserData();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const awardPoints = async (
    action: string,
    pointsAmount: number,
    referenceId?: string,
    referenceType?: string
  ) => {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('gamification', {
        body: {
          action: 'award_points',
          userId: user.id,
          pointsAction: action,
          points: pointsAmount,
          referenceId,
          referenceType,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.data?.success) {
        await fetchUserData();
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const checkBadges = async () => {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('gamification', {
        body: { action: 'check_badges', userId: user.id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.data?.newBadges?.length > 0) {
        await fetchUserData();
        return response.data.newBadges;
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
    return [];
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-muted-foreground';
      case 'rare':
        return 'text-blue-500';
      case 'epic':
        return 'text-purple-500';
      case 'legendary':
        return 'text-amber-500';
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
    refresh: fetchUserData,
    getRarityColor,
  };
}
