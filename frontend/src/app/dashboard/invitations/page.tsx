'use client';

import { useState } from 'react';
import { useInvitations } from '@/hooks/useApi';
import { invitationApi } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, X, Filter } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Invitation } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DECLINED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

type FilterType = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export default function InvitationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all invitations — no server-side filter so we can switch tabs instantly
  const { data, isLoading, refetch } = useInvitations({ limit: 100 });

  // All invitations from server
  const allInvitations: Invitation[] = (data as any)?.data || [];

  // Client-side filter
  // Hide DECLINED and EXPIRED from ALL view — they're clutter
const visibleInvitations = allInvitations.filter(
  (i) => i.status !== 'DECLINED' && i.status !== 'EXPIRED'
);

// Client-side filter
const invitations =
  filter === 'ALL'
    ? visibleInvitations
    : allInvitations.filter((i) => i.status === filter);

  const pendingCount = allInvitations.filter((i) => i.status === 'PENDING').length;

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Refreshed.');
  };

  // Cancel
  const { mutate: cancelInvite } = useMutation({
    mutationFn: (id: string) => invitationApi.cancel(id),
    onMutate: (id) => setLoadingId(id),
    onSuccess: (_data, id) => {
      // Optimistically update the cache so UI reflects immediately
      qc.setQueryData(['invitations', { limit: 100 }], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((inv: Invitation) =>
            inv.id === id ? { ...inv, status: 'DECLINED' } : inv
          ),
        };
      });
      toast.success('Invitation cancelled.');
      // Also do a full refetch in background to sync with server
      refetch();
    },
    onError: () => toast.error('Failed to cancel invitation.'),
    onSettled: () => setLoadingId(null),
  });

  // Resend
  const { mutate: resendInvite } = useMutation({
    mutationFn: (id: string) => invitationApi.resend(id),
    onMutate: (id) => setLoadingId(id),
    onSuccess: () => {
      refetch();
      toast.success('Invitation resent successfully.');
    },
    onError: () => toast.error('Failed to resend invitation.'),
    onSettled: () => setLoadingId(null),
  });

  const handleCancel = (id: string) => {
    if (confirm('Cancel this invitation? The invite link will stop working.')) {
      cancelInvite(id);
    }
  };

  const acceptedCount = allInvitations.filter((i) => i.status === 'ACCEPTED').length;
  const declinedCount = allInvitations.filter((i) => i.status === 'DECLINED').length;
  const expiredCount = allInvitations.filter((i) => i.status === 'EXPIRED').length;

  const FILTER_TABS: { label: string; value: FilterType }[] = [
    { label: `Active (${visibleInvitations.length})`, value: 'ALL' },
    { label: `Pending (${pendingCount})`, value: 'PENDING' },
    { label: `Accepted (${acceptedCount})`, value: 'ACCEPTED' },
    { label: `Cancelled (${declinedCount})`, value: 'DECLINED' },
    { label: `Expired (${expiredCount})`, value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invitations</h2>
          <p className="text-muted-foreground text-sm">
            {visibleInvitations.length} active · {pendingCount} pending
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filter === tab.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))
        ) : invitations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {filter === 'ALL' ? 'No invitations yet' : `No ${filter.toLowerCase()} invitations`}
            </p>
            {filter === 'ALL' && (
              <p className="text-sm mt-1">
                Go to{' '}
                <a href="/dashboard/members" className="text-primary hover:underline">
                  Members
                </a>{' '}
                to invite team members
              </p>
            )}
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                className="text-sm text-primary hover:underline mt-1"
              >
                Show all invitations
              </button>
            )}
          </div>
        ) : (
          invitations.map((inv) => (
            <Card
              key={inv.id}
              className={cn(
                'transition-opacity',
                inv.status === 'DECLINED' && 'opacity-60'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    inv.status === 'PENDING' ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Mail className={cn(
                      'w-4 h-4',
                      inv.status === 'PENDING' ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{inv.email}</p>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', STATUS_COLORS[inv.status])}
                      >
                        {inv.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {inv.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sent {formatDate(inv.createdAt)}
                      {inv.status === 'PENDING' && ` · Expires ${formatDate(inv.expiresAt)}`}
                      {inv.status === 'ACCEPTED' && inv.acceptedAt && ` · Accepted ${formatDate(inv.acceptedAt)}`}
                    </p>
                    {inv.invitedBy && (
                      <p className="text-xs text-muted-foreground">
                        Invited by {inv.invitedBy.firstName} {inv.invitedBy.lastName}
                      </p>
                    )}
                  </div>

                  {/* Actions — only for PENDING */}
                  {inv.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingId === inv.id}
                        onClick={() => resendInvite(inv.id)}
                        title="Resend invitation email"
                      >
                        <RefreshCw className={cn(
                          'w-3.5 h-3.5 mr-1.5',
                          loadingId === inv.id && 'animate-spin'
                        )} />
                        Resend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingId === inv.id}
                        onClick={() => handleCancel(inv.id)}
                        className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5"
                        title="Cancel invitation"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}