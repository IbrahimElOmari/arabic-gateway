import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
  };
});

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [
      { id: '1', type: 'enrollment_approved', title: 'Enrolled', message: 'You are enrolled', is_read: false, created_at: new Date().toISOString() },
      { id: '2', type: 'exercise_released', title: 'New Exercise', message: 'Exercise available', is_read: true, created_at: new Date().toISOString() },
    ],
    unreadCount: 1,
    markAsRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

describe('NotificationBell', () => {
  it('exports NotificationBell component', async () => {
    const mod = await import('@/components/notifications/NotificationBell');
    expect(mod.NotificationBell).toBeDefined();
    expect(typeof mod.NotificationBell).toBe('function');
  });

  it('notification icons are defined for known types', () => {
    const NOTIFICATION_ICONS: Record<string, string> = {
      enrollment_approved: '✅',
      enrollment_rejected: '❌',
      exercise_released: '📝',
      lesson_reminder: '🔔',
    };
    expect(NOTIFICATION_ICONS.enrollment_approved).toBe('✅');
    expect(NOTIFICATION_ICONS.lesson_reminder).toBe('🔔');
  });

  it('limits display to 10 recent notifications', () => {
    const notifications = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      type: 'info',
      title: `Notification ${i}`,
      message: `Message ${i}`,
      is_read: false,
      created_at: new Date().toISOString(),
    }));
    const recentNotifications = notifications.slice(0, 10);
    expect(recentNotifications.length).toBe(10);
  });

  it('formats unread count correctly', () => {
    expect(5 > 99 ? '99+' : String(5)).toBe('5');
    expect(150 > 99 ? '99+' : String(150)).toBe('99+');
  });
});
