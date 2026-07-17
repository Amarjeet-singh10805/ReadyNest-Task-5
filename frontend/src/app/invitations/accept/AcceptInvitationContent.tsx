'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { invitationApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

const newUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type NewUserForm = z.infer<typeof newUserSchema>;

export default function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [orgName, setOrgName] = useState('');

  // If already logged in — accept directly without needing to create account
  const { mutate: acceptDirect, isPending: acceptingDirect } = useMutation({
    mutationFn: () => invitationApi.accept({ token: token! }),
    onSuccess: (res) => {
      const data = res.data.data;
      setOrgName(data.organizationName);
      setAccepted(true);
      toast.success(`Welcome to ${data.organizationName}!`);
      setTimeout(() => router.push('/dashboard'), 2000);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // New user — create account + accept
  const { mutate: acceptAsNewUser, isPending: acceptingNew } = useMutation({
    mutationFn: (data: Omit<NewUserForm, 'confirmPassword'>) =>
      invitationApi.accept({ token: token!, ...data }),
    onSuccess: (res) => {
      const data = res.data.data;
      setOrgName(data.organizationName);
      setAccepted(true);
      toast.success(`Account created! Welcome to ${data.organizationName}!`);
      setTimeout(() => router.push('/auth/login'), 2500);
    },
    onError: (e) => {
      const msg = getErrorMessage(e);
      // If user already exists, show existing user form
      if (msg.toLowerCase().includes('already')) {
        setIsExistingUser(true);
      }
      toast.error(msg);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
  });

  const onSubmit = ({ confirmPassword: _, ...data }: NewUserForm) => {
    acceptAsNewUser(data);
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Invalid Invitation Link</h2>
            <p className="text-muted-foreground text-sm">
              This invitation link is missing or invalid. Please ask your admin to resend the invitation.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully accepted
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-10 pb-8 space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              </motion.div>
              <h2 className="text-2xl font-bold">You're in! 🎉</h2>
              <p className="text-muted-foreground">
                You've successfully joined <strong>{orgName}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you to {isAuthenticated ? 'dashboard' : 'login'}...
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">You've been invited!</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Accept your invitation to join the organization
          </p>
        </div>

        <Card>
          {/* Already logged in */}
          {isAuthenticated ? (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Accept Invitation</CardTitle>
                <CardDescription>
                  You're already logged in. Click below to join the organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-center text-muted-foreground">
                  You'll be added to the organization with your current account.
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  className="w-full"
                  onClick={() => acceptDirect()}
                  disabled={acceptingDirect}
                >
                  {acceptingDirect
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining…</>
                    : '✅ Accept Invitation'
                  }
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">Go to Dashboard instead</Link>
                </Button>
              </CardFooter>
            </>
          ) : (
            /* New user — create account */
            <>
              <CardHeader>
                <CardTitle className="text-lg">Create Your Account</CardTitle>
                <CardDescription>
                  Set up your account to join the organization
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input placeholder="Alice" {...register('firstName')} />
                      {errors.firstName && (
                        <p className="text-destructive text-xs">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input placeholder="Johnson" {...register('lastName')} />
                      {errors.lastName && (
                        <p className="text-destructive text-xs">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-xs">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                      <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    ℹ️ Your email address is already set from the invitation link.
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={acceptingNew}>
                    {acceptingNew
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                      : 'Create Account & Join'
                    }
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Already have an account?{' '}
                    <Link
                      href={`/auth/login?redirect=/invitations/accept?token=${token}`}
                      className="text-primary hover:underline"
                    >
                      Sign in instead
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
