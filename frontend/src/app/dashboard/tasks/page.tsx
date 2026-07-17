'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, List, LayoutGrid, Clock, Trash2 } from 'lucide-react';
import { useTasks, useCreateTask, useDeleteTask, useProjects } from '@/hooks/useApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDate, getInitials, PRIORITY_COLORS, STATUS_COLORS, PRIORITY_ICONS } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import type { Task, TaskStatus, TaskPriority } from '@/types';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

type FormData = {
  title: string;
  description: string;
  projectId: string;
  priority: string;
  status: string;
  dueDate: string;
};

function TaskCard({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="card-hover cursor-pointer group">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <span className={cn('text-base', PRIORITY_COLORS[task.priority])} title={task.priority}>
                {PRIORITY_ICONS[task.priority]}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {task.assignee && (
                <Avatar className="w-5 h-5">
                  <AvatarImage src={task.assignee.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assignee.firstName, task.assignee.lastName)}
                  </AvatarFallback>
                </Avatar>
              )}
              {task.project && (
                <span className="text-xs text-muted-foreground truncate max-w-20">
                  {task.project.name}
                </span>
              )}
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDate(task.dueDate, 'MMM d')}
              </div>
            )}
          </div>
          {task._count && task._count.comments > 0 && (
            <p className="text-xs text-muted-foreground">{task._count.comments} comments</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TasksPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useTasks({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    projectId: projectFilter !== 'all' ? projectFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    limit: 50,
  });

  const { data: projectsData } = useProjects({ limit: 100 });
  const { mutateAsync: createTask, isPending: creating } = useCreateTask();
  const { mutate: deleteTask } = useDeleteTask();

  const tasks: Task[] = (data as any)?.data || [];
  const projects = (projectsData as any)?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { priority: 'MEDIUM', status: 'TODO' },
  });

  const onSubmit = async (formData: FormData) => {
    await createTask(formData);
    setCreateOpen(false);
    reset({ priority: 'MEDIUM', status: 'TODO' });
  };

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const totalShown = tasks.length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground text-sm">
            {totalShown} task{totalShown !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` · ${STATUS_LABELS[statusFilter as TaskStatus]}` : ''}
            {priorityFilter !== 'all' ? ` · ${priorityFilter} priority` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'board' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('board')}
            title="Board view"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            title="List view"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            className="pl-9 w-52"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_ICONS[p]} {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {(statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setProjectFilter('all');
              setSearch('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Board / List */}
      {isLoading ? (
        <div className="flex gap-4">
          {STATUSES.map((s) => <Skeleton key={s} className="h-64 w-72 shrink-0" />)}
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {STATUSES.map((status) => (
            <div key={status} className="shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={cn('text-xs', STATUS_COLORS[status])} variant="secondary">
                  {STATUS_LABELS[status]}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  {tasksByStatus[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {tasksByStatus[status].map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={(id) => {
                    if (confirm('Delete this task?')) deleteTask(id);
                  }} />
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No tasks found</div>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="card-hover">
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge className={cn('text-xs shrink-0', STATUS_COLORS[task.status])} variant="secondary">
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    {task.project && (
                      <p className="text-xs text-muted-foreground">{task.project.name}</p>
                    )}
                  </div>
                  <span className={cn('text-xs shrink-0 font-medium', PRIORITY_COLORS[task.priority])}>
                    {PRIORITY_ICONS[task.priority]} {task.priority}
                  </span>
                  {task.assignee && (
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={task.assignee.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assignee.firstName, task.assignee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(task.dueDate, 'MMM d')}
                    </span>
                  )}
                  <button
                    onClick={() => confirm('Delete this task?') && deleteTask(task.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Design homepage mockup"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional details…" rows={3} {...register('description')} />
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project <span className="text-destructive">*</span></Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                {...register('projectId', { required: 'Please select a project' })}
              >
                <option value="">Select a project…</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.projectId && <p className="text-destructive text-xs">{errors.projectId.message}</p>}
            </div>

            {/* Status + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  {...register('status')}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  {...register('priority')}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_ICONS[p]} {p.charAt(0) + p.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register('dueDate')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}