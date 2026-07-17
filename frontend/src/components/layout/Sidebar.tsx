'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users,
  FileText, Bell, Settings, LogOut, ChevronDown,
  Shield, BarChart2, Mail, Building2,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore, useUser, useActiveOrg, useOrganizations } from '@/store/auth.store';
import { useLogout } from '@/hooks/useApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/files', label: 'Files', icon: FileText },
  { href: '/dashboard/invitations', label: 'Invitations', icon: Mail },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: Shield },
];

const bottomNavItems = [
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useUser();
  const activeOrg = useActiveOrg();
  const organizations = useOrganizations();
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);
  const { mutate: logout } = useLogout();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="w-60 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-semibold text-sm">SaaS Platform</span>
          </div>
        </div>

        {/* Org Switcher */}
        <div className="px-3 py-3 border-b border-sidebar-border">
          <button
            onClick={() => setOrgMenuOpen(!orgMenuOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {activeOrg?.name?.charAt(0) || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{activeOrg?.name || 'Select Org'}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{activeOrg?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
            <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', orgMenuOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {orgMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-1"
              >
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { setActiveOrganization(org.id); setOrgMenuOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                      org.id === activeOrg?.id
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'hover:bg-sidebar-accent'
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="truncate">{org.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                isActive(href)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom Nav */}
        <div className="px-3 py-2 border-t border-sidebar-border space-y-0.5">
          {bottomNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                isActive(href)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
