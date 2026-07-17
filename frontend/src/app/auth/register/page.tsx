'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  role: z.enum(['ORG_ADMIN', 'MEMBER'], { required_error: 'Please select a role' }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const ROLES = [
  {
    value: 'ORG_ADMIN',
    label: 'Organization Admin',
    description: 'Full control — manage members, projects, settings, and billing.',
    icon: '🛡️',
  },
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Collaborate on tasks and projects assigned to you.',
    icon: '👤',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'ORG_ADMIN' | 'MEMBER'>('ORG_ADMIN');

  const { mutateAsync: register_, isPending } = useMutation({
    mutationFn: (data: Omit<FormData, 'confirmPassword'>) =>
      authApi.register({
        email: data.email!,
        password: data.password!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        organizationName: data.organizationName,
      }),
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ORG_ADMIN' },
  });

  const handleRoleSelect = (role: 'ORG_ADMIN' | 'MEMBER') => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async ({ confirmPassword: _, ...data }: FormData) => {
    try {
      await register_(data);
      toast.success('Account created! Please check your email to verify your account.');
      router.push('/auth/login');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground mt-1">Start your free workspace today</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sign Up</CardTitle>
          <CardDescription>Fill in your details to get started</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Alice" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-destructive text-xs">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Johnson" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-destructive text-xs">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Acme Corp"
                {...register('organizationName')}
              />
              {errors.organizationName && (
                <p className="text-destructive text-xs">{errors.organizationName.message}</p>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value as 'ORG_ADMIN' | 'MEMBER')}
                    className={`
                      relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left
                      transition-all duration-150 hover:border-primary/50
                      ${selectedRole === role.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background'
                      }
                    `}
                  >
                    {/* Selected indicator */}
                    {selectedRole === role.value && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                    )}
                    <span className="text-lg">{role.icon}</span>
                    <span className={`text-xs font-semibold ${selectedRole === role.value ? 'text-primary' : 'text-foreground'}`}>
                      {role.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {role.description}
                    </span>
                  </button>
                ))}
              </div>
              {/* hidden input so RHF tracks the value */}
              <input type="hidden" {...register('role')} value={selectedRole} />
              {errors.role && (
                <p className="text-destructive text-xs">{errors.role.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
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

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
              )}
            </div>

          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                : 'Create Account'
              }
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              By registering you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
