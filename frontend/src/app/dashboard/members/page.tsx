'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, MoreHorizontal, ShieldCheck, UserX, Link, Copy, Check } from 'lucide-react';
import { useMembers, useSendInvitation } from '@/hooks/useApi';
import { useActiveOrgId, useUser } from '@/store/auth.store';
import { organizationApi } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { OrganizationMember } from '@/types';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ORG_ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  MEMBER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const orgId = useActiveOrgId();
  const currentUser = useUser();
  const qc = useQueryClient();

  const { data, isLoading } = useMembers(orgId || '', { search: search || undefined });
  const { mutateAsync: sendInvitation, isPending: inviting } = useSendInvitation();

  const { mutate: updateRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      organizationApi.updateMemberRole(orgId!, userId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); toast.success('Role updated.'); },
    onError: () => toast.error('Failed to update role.'),
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(orgId!, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members'] }); toast.success('Member removed.'); },
  });

  const { register, handleSubmit, reset, setValue } = useForm<{
    email: string; role: string; message: string;
  }>({ defaultValues: { role: 'MEMBER' } });

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onInvite = async (data: any) => {
    const result = await sendInvitation({ ...data, organizationId: orgId! });
    setInviteOpen(false);
    reset();
    if (result?.inviteUrl) {
      setInviteLink(result.inviteUrl);
    }
  };

  const members: OrganizationMember[] = (data as any)?.data || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-muted-foreground text-sm">{members.length} members in this organization</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search members…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : members.map((member) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="card-hover">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.user.avatarUrl} />
                    <AvatarFallback>{getInitials(member.user.firstName, member.user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{member.user.firstName} {member.user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <Badge className={cn('text-xs', ROLE_COLORS[member.role])} variant="secondary">
                    {member.role.replace('_', ' ')}
                  </Badge>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    Joined {formatDate(member.joinedAt)}
                  </div>
                  {currentUser?.id !== member.user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateRole({ userId: member.user.id, role: 'ORG_ADMIN' })}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateRole({ userId: member.user.id, role: 'MEMBER' })}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirm('Remove member?') && removeMember(member.user.id)}
                        >
                          <UserX className="w-3.5 h-3.5 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        }
      </div>

      {/* Invite Link Dialog */}
      <Dialog open={!!inviteLink} onOpenChange={(open) => !open && setInviteLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-4 h-4 text-primary" />
              Invitation Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share this link with the invitee. It expires in <strong>7 days</strong>.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <p className="flex-1 text-xs font-mono break-all text-foreground select-all">
                {inviteLink}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={copyLink}
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copied!</>
                  : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy</>
                }
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 In production, this link is also emailed to the invitee automatically.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="colleague@company.com" {...register('email', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="MEMBER" onValueChange={(v) => setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ORG_ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Input placeholder="Join our team!" {...register('message')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invite'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}