import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  authApi, organizationApi, projectApi, taskApi,
  fileApi, invitationApi, dashboardApi, notificationApi, userApi, auditApi,
} from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/lib/utils';

// ============================
// AUTH HOOKS
// ============================
export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe().then((r) => r.data.data),
    enabled: useAuthStore.getState().isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

export const useLogin = () => {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (data: { email: string; password: string; organizationId?: string }) =>
      authApi.login(data).then((r) => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.organizations, data.activeOrganizationId);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      qc.clear();
    },
  });
};

// ============================
// ORGANIZATION HOOKS
// ============================
export const useOrganizations = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['organizations', params],
    queryFn: () => organizationApi.getAll(params).then((r) => r.data),
  });

export const useOrganization = (id: string) =>
  useQuery({
    queryKey: ['organizations', id],
    queryFn: () => organizationApi.getOne(id).then((r) => r.data.data),
    enabled: !!id,
  });

export const useUpdateOrganization = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => organizationApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations', id] });
      toast.success('Organization updated.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useMembers = (orgId: string, params?: any) =>
  useQuery({
    queryKey: ['members', orgId, params],
    queryFn: () => organizationApi.getMembers(orgId, params).then((r) => r.data),
    enabled: !!orgId,
  });

// ============================
// PROJECT HOOKS
// ============================
export const useProjects = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectApi.getAll(params).then((r) => r.data),
  });

export const useProject = (id: string) =>
  useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectApi.getOne(id).then((r) => r.data.data),
    enabled: !!id,
  });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => projectApi.create(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateProject = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => projectApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

// ============================
// TASK HOOKS
// ============================
export const useTasks = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['tasks', params],
    queryFn: () => taskApi.getAll(params).then((r) => r.data),
    enabled: !!params?.projectId || true,
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: ['tasks', id],
    queryFn: () => taskApi.getOne(id).then((r) => r.data.data),
    enabled: !!id,
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => taskApi.create(data).then((r) => r.data.data),
    onMutate: async (newTask) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData(['tasks', { projectId: newTask.projectId }]);
      // Optimistic update
      qc.setQueryData(['tasks', { projectId: newTask.projectId }], (old: any) => {
        if (!old) return old;
        return { ...old, data: [{ ...newTask, id: 'temp-' + Date.now() }, ...old.data] };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev);
      toast.error('Failed to create task.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created.');
    },
  });
};

export const useUpdateTask = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => taskApi.update(id, data).then((r) => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['tasks', id], updated);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useAddComment = (taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      taskApi.addComment(taskId, content, parentId).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

// ============================
// FILE HOOKS
// ============================
export const useFiles = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['files', params],
    queryFn: () => fileApi.getAll(params).then((r) => r.data),
  });

export const useUploadFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta?: any }) =>
      fileApi.upload(file, meta).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('File uploaded.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      toast.success('File deleted.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

// ============================
// INVITATION HOOKS
// ============================
export const useInvitations = (params?: any) =>
  useQuery({
    queryKey: ['invitations', params],
    queryFn: () => invitationApi.getAll(params).then((r) => r.data),
    refetchOnWindowFocus: true,
    staleTime: 0, // always refetch — so refresh button always gets fresh data
  });

export const useSendInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => invitationApi.send(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

// ============================
// DASHBOARD HOOKS
// ============================
export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data.data),
    refetchInterval: 5 * 60 * 1000,
  });

export const useMyTasks = () =>
  useQuery({
    queryKey: ['dashboard', 'my-tasks'],
    queryFn: () => dashboardApi.getMyTasks().then((r) => r.data.data),
  });

// ============================
// NOTIFICATION HOOKS
// ============================
export const useNotifications = (params?: any) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.getAll(params).then((r) => r.data),
    refetchInterval: 30 * 1000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read.');
    },
  });
};

// ============================
// USER HOOKS
// ============================
export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (data: any) => userApi.updateProfile(data).then((r) => r.data.data),
    onSuccess: (data) => {
      setUser(data);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userApi.changePassword(currentPassword, newPassword),
    onSuccess: () => toast.success('Password changed.'),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

// ============================
// AUDIT HOOKS
// ============================
export const useAuditLogs = (params?: any) =>
  useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.getLogs(params).then((r) => r.data),
  });