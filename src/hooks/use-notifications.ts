/**
 * In-app notification system using Supabase Realtime.
 * Respects user notification preferences from profiles table.
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiQuery, apiMutate } from '@/lib/supabase-api';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

// Notification type to preference field mapping
const NOTIFICATION_PREFERENCE_MAP: Record<string, string> = {
  exercise_released: 'exercise_notifications',
  lesson_reminder: 'lesson_reminders',
  enrollment_approved: 'email_notifications',
  enrollment_rejected: 'email_notifications',
};

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: () => apiQuery<any>('profiles', (q) =>
      q.select('email_notifications, lesson_reminders, exercise_notifications').eq('user_id', user!.id).single()
    ),
    enabled: !!user,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiQuery<AppNotification[]>('notifications', (q) =>
      q.select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50)
    ),
    enabled: !!user,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiMutate('notifications', (q) => q.update({ is_read: true }).eq('id', notificationId)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }); },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      apiMutate('notifications', (q) => q.update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }); },
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notification = payload.new as AppNotification;

          // Check if user has this notification type enabled
          const prefField = NOTIFICATION_PREFERENCE_MAP[notification.type];
          if (prefField && preferences && preferences[prefField] === false) {
            return; // User has opted out of this notification type
          }

          toast({ title: notification.title, description: notification.message });
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, toast, queryClient, preferences]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
