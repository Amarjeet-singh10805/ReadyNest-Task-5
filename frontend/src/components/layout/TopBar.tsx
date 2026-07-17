'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, Moon, Sun, Monitor, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useApi';
import { useSocket } from '@/components/common/SocketProvider';
import Link from 'next/link';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/projects': 'Projects',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/members': 'Members',
  '/dashboard/files': 'Files',
  '/dashboard/invitations': 'Invitations',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/audit-logs': 'Audit Logs',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isConnected } = useSocket();
  const { data: notifData } = useNotifications({ isRead: false, limit: 1 });

  const title = PAGE_TITLES[pathname] || 'Dashboard';
  const unreadCount = (notifData as any)?.unreadCount || 0;

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      {/* Search */}
      <div className="relative hidden md:block w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search…" className="pl-9 h-9 text-sm" />
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isConnected ? (
          <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="hidden sm:inline">Live</span></>
        ) : (
          <><WifiOff className="w-3.5 h-3.5 text-muted-foreground/50" /><span className="hidden sm:inline">Offline</span></>
        )}
      </div>

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="w-4 h-4 mr-2" /> Light</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="w-4 h-4 mr-2" /> Dark</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="w-4 h-4 mr-2" /> System</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <Link href="/dashboard/notifications">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </Link>
    </header>
  );
}
