/**
 * Manual type definitions for gamification tables not fully represented in auto-generated types.
 */

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  exercises_completed: number;
  lessons_attended: number;
  perfect_scores: number;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  is_displayed: boolean;
  badge: Badge;
}

export interface Badge {
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

export interface LeaderboardEntry {
  user_id: string;
  points: number;
  rank: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}
