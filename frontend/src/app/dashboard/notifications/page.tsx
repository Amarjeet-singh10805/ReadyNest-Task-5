'use client';

import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Notification } from '@/types';
import { motion } from 'framer-motion';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications({ limit: 50 });
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending } = useMarkAllNotificationsRead();

  const notifications: Notification[] = (data as any)?.data || [];
  const unreadCount = (data as any)?.unreadCount || 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead()} disabled={isPending}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : notifications.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>You're all caught up!</p>
            </div>
          )
          : notifications.map((n) => (
            <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card
                className={cn('cursor-pointer transition-colors', !n.isRead && 'border-primary/30 bg-primary/5')}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{n.type.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))
        }
      </div>
    </div>
  );
}
