import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, AppNotification } from '@/hooks/use-notifications';
import { formatRelative } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<string, string> = {
  enrollment_approved: '✅',
  enrollment_rejected: '❌',
  exercise_released: '📝',
  lesson_reminder: '🔔',
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const icon = NOTIFICATION_ICONS[notification.type] || '📢';

  return (
    <button
      onClick={() => !notification.is_read && onRead(notification.id)}
      className={cn(
        'w-full text-start flex items-start gap-3 p-3 rounded-md transition-colors hover:bg-accent',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelative(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('notifications.bell', 'Notifications ({{count}})', { count: unreadCount })}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -end-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">
            {t('notifications.title', 'Notifications')}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3 w-3 me-1" aria-hidden="true" />
              {t('notifications.markAllRead', 'Mark all read')}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {recentNotifications.length > 0 ? (
            <div className="divide-y">
              {recentNotifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {t('notifications.empty', 'No notifications yet')}
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
