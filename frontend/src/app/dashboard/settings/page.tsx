'use client';
import { useUser } from '@/store/auth.store';
import { useUpdateProfile, useChangePassword } from '@/hooks/useApi';
import { userApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm } from 'react-hook-form';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

export default function SettingsPage() {
  const user = useUser();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: changePassword, isPending: changingPwd } = useChangePassword();

  const { register: reg1, handleSubmit: hs1 } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
      bio: '',
    },
  });

  const {
    register: reg2,
    handleSubmit: hs2,
    reset: reset2,
    formState: { errors: errors2 },
    watch,
  } = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await userApi.uploadAvatar(file);
      setUser({ avatarUrl: res.data.data.avatarUrl });
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Avatar updated.');
    } catch {
      toast.error('Failed to upload avatar.');
    }
  };

  const onPasswordSubmit = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    changePassword(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset2() }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your profile and account preferences</p>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
          <CardDescription>Update your avatar</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {user ? getInitials(user.firstName, user.lastName) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Change Avatar
            </Button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP up to 10MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={hs1((d) => updateProfile(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...reg1('firstName')} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...reg1('lastName')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+1 (555) 000-0000" {...reg1('phone')} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={3} placeholder="Tell your team a bit about yourself…" {...reg1('bio')} />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Use a strong, unique password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={hs2(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" {...reg2('currentPassword', { required: 'Required' })} />
              {errors2.currentPassword && <p className="text-destructive text-xs">{errors2.currentPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" {...reg2('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
              {errors2.newPassword && <p className="text-destructive text-xs">{errors2.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" {...reg2('confirmPassword', { required: 'Required' })} />
              {errors2.confirmPassword && <p className="text-destructive text-xs">{errors2.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={changingPwd}>
              {changingPwd ? 'Changing…' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account role</span>
            <span className="font-medium">{user?.role?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email verified</span>
            <span className={user?.isEmailVerified ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
              {user?.isEmailVerified ? 'Yes' : 'No'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
