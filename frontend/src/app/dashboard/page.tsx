'use client';

import { motion } from 'framer-motion';
import {
  Users, FolderKanban, CheckSquare, TrendingUp,
  Clock, AlertCircle, Plus, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardStats, useMyTasks } from '@/hooks/useApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn, formatRelativeTime, getInitials, PRIORITY_COLORS, STATUS_COLORS } from '@/lib/utils';
import Link from 'next/link';

const STATUS_CHART_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];
const PRIORITY_CHART_COLORS = { LOW: '#94a3b8', MEDIUM: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444' };

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function KPICard({ title, value, icon: Icon, description, color = 'text-primary', trend }: any) {
  return (
    <motion.div variants={item}>
      <Card className="card-hover">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              {/* FIX: use <div> not <p> so Skeleton (a div) is valid HTML */}
              <div className="text-3xl font-bold mt-1">
                {value ?? <Skeleton className="h-8 w-16" />}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={cn('p-2.5 rounded-xl bg-primary/10', color)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
          {trend !== undefined && (
            <div className="mt-3">
              <Progress value={trend} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{trend}% completion rate</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: myTasksData } = useMyTasks();

  const kpis = stats?.kpis;
  const charts = stats?.charts;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time insights for your organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/projects"><FolderKanban className="w-4 h-4 mr-1.5" /> Projects</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/tasks"><Plus className="w-4 h-4 mr-1.5" /> New Task</Link>
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Members" value={kpis?.totalMembers} icon={Users} description={`+${kpis?.newMembersThisMonth ?? 0} this month`} />
        <KPICard title="Active Projects" value={kpis?.activeProjects} icon={FolderKanban} description={`${kpis?.totalProjects ?? 0} total`} color="text-blue-500" />
        <KPICard title="Total Tasks" value={kpis?.totalTasks} icon={CheckSquare} description={`${kpis?.newTasksThisWeek ?? 0} new this week`} color="text-purple-500" />
        <KPICard
          title="Completion Rate"
          value={kpis ? `${kpis.completionRate}%` : undefined}
          icon={TrendingUp}
          color="text-green-500"
          trend={kpis?.completionRate}
        />
      </motion.div>

      {/* Secondary KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{kpis?.overdueTasks ?? 0}</div>
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{kpis?.completedTasks ?? 0}</div>
                <p className="text-xs text-muted-foreground">Completed Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-purple-500 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{kpis?.filesCount ?? 0}</div>
                <p className="text-xs text-muted-foreground">Files Stored</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <div className="text-2xl font-bold">{kpis?.unreadNotifications ?? 0}</div>
                <p className="text-xs text-muted-foreground">Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid md:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task Trends (6 months)</CardTitle>
            <CardDescription>Tasks created vs completed per month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={charts?.monthlyTrend || []}>
                  <defs>
                    <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="completed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="created" stroke="#6366f1" fill="url(#created)" name="Created" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#completed)" name="Completed" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-full mx-auto" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={charts?.tasksByStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {charts?.tasksByStatus?.map((_, i) => (
                      <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {charts?.tasksByStatus?.map((s, i) => (
                <div key={s.status} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{s.status.replace('_', ' ')}</span>
                  <span className="font-medium ml-auto">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={item} className="grid md:grid-cols-3 gap-4">
        {/* Completion Trend Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Completions</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-36 w-full" /> : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={charts?.completionTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short' })} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Contributors</CardTitle>
            <CardDescription>Most tasks completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              : stats?.topContributors?.slice(0, 5).map((c, i) => (
                <div key={c.user?.id} className="flex items-center gap-2.5">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={c.user?.avatarUrl} />
                    <AvatarFallback className="text-xs">{c.user ? getInitials(c.user.firstName, c.user.lastName) : '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{c.user?.firstName} {c.user?.lastName}</span>
                  <Badge variant="secondary" className="text-xs">{c.tasksCompleted}</Badge>
                </div>
              ))
            }
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
              <Link href="/dashboard/audit-logs">All <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              : stats?.recentActivity?.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 mt-0.5">
                    <AvatarImage src={(a as any).user?.avatarUrl} />
                    <AvatarFallback className="text-xs">{(a as any).user ? getInitials((a as any).user.firstName, (a as any).user.lastName) : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed">
                      <span className="font-medium">{(a as any).user?.firstName}</span>{' '}
                      {a.action} {a.entityType}{' '}
                      {a.entityName && <span className="text-primary">"{a.entityName}"</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
