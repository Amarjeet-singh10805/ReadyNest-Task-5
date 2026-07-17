'use client';
import { useAuditLogs } from '@/hooks/useApi';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import type { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs({ limit: 50 });
  const logs: AuditLog[] = (data as any)?.data || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="text-muted-foreground text-sm">Security and activity audit trail</p>
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)
          : logs.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No audit logs found</p>
            </div>
          )
          : logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {log.user && (
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(log.user.firstName, log.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                    {log.user && (
                      <span className="text-xs text-muted-foreground">
                        by {log.user.firstName} {log.user.lastName}
                      </span>
                    )}
                  </div>
                  {log.ipAddress && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{log.ipAddress}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(log.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
