export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number; projects: number };
}

export interface OrganizationMember {
  id: string;
  role: Role;
  joinedAt: string;
  isActive: boolean;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl' | 'lastLoginAt'>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  organizationId: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number; files: number };
  taskStats?: Record<TaskStatus, number>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  organizationId: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  project?: Pick<Project, 'id' | 'name' | 'color'>;
  comments?: Comment[];
  files?: FileRecord[];
  _count?: { comments: number; files: number };
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  isEdited: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  replies?: Comment[];
}

export interface FileRecord {
  id: string;
  name: string;
  originalName: string;
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  organizationId: string;
  uploadedById: string;
  projectId?: string;
  taskId?: string;
  folder?: string;
  createdAt: string;
  uploadedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  project?: Pick<Project, 'id' | 'name'>;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  message?: string;
  createdAt: string;
  invitedBy?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  organizationId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

export interface ActivityLog {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DashboardStats {
  kpis: {
    totalMembers: number;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    overdueTasks: number;
    activeProjects: number;
    newMembersThisMonth: number;
    newTasksThisWeek: number;
    filesCount: number;
    unreadNotifications: number;
  };
  charts: {
    tasksByStatus: Array<{ status: TaskStatus; count: number }>;
    tasksByPriority: Array<{ priority: TaskPriority; count: number }>;
    projectsByStatus: Array<{ status: ProjectStatus; count: number }>;
    completionTrend: Array<{ date: string; completed: number }>;
    monthlyTrend: Array<{ month: string; created: number; completed: number }>;
  };
  topContributors: Array<{ user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>; tasksCompleted: number }>;
  recentActivity: ActivityLog[];
}
