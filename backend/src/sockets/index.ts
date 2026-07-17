import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

let io: SocketServer;
const onlineUsers = new Map<string, { userId: string; organizationIds: string[]; socketId: string }>();

export const initializeSocket = (server: HttpServer): void => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          organizations: { where: { isActive: true }, select: { organizationId: true } },
        },
      });

      if (!user?.isActive) return next(new Error('User not found or inactive'));

      (socket as any).user = {
        ...decoded,
        organizationIds: user.organizations.map((o) => o.organizationId),
      };

      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${user.userId} (${socket.id})`);

    // Track online users
    onlineUsers.set(socket.id, {
      userId: user.userId,
      organizationIds: user.organizationIds,
      socketId: socket.id,
    });

    // Join organization rooms
    user.organizationIds.forEach((orgId: string) => {
      socket.join(`org:${orgId}`);
      // Notify org members of online status
      socket.to(`org:${orgId}`).emit('user:online', { userId: user.userId });
    });

    // Personal room for direct notifications
    socket.join(`user:${user.userId}`);

    // Send current online users in shared orgs
    const orgOnlineUsers: Record<string, string[]> = {};
    user.organizationIds.forEach((orgId: string) => {
      orgOnlineUsers[orgId] = getOnlineUsersForOrg(orgId);
    });
    socket.emit('users:online', orgOnlineUsers);

    // ===== TASK EVENTS =====
    socket.on('task:subscribe', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('task:unsubscribe', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    // ===== TYPING INDICATORS =====
    socket.on('task:typing', ({ taskId, organizationId }: { taskId: string; organizationId: string }) => {
      socket.to(`org:${organizationId}`).emit('task:typing', {
        taskId,
        userId: user.userId,
      });
    });

    socket.on('task:typing:stop', ({ taskId, organizationId }: { taskId: string; organizationId: string }) => {
      socket.to(`org:${organizationId}`).emit('task:typing:stop', {
        taskId,
        userId: user.userId,
      });
    });

    // ===== DASHBOARD =====
    socket.on('dashboard:subscribe', (organizationId: string) => {
      if (user.organizationIds.includes(organizationId)) {
        socket.join(`dashboard:${organizationId}`);
      }
    });

    // ===== NOTIFICATIONS =====
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await prisma.notification.updateMany({
          where: { id: notificationId, userId: user.userId },
          data: { isRead: true },
        });
        socket.emit('notification:updated', { id: notificationId, isRead: true });
      } catch (error) {
        logger.error('Error marking notification read:', error);
      }
    });

    // ===== PRESENCE =====
    socket.on('ping:presence', () => {
      socket.emit('pong:presence', { timestamp: Date.now() });
    });

    // ===== DISCONNECT =====
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${user.userId} - ${reason}`);
      onlineUsers.delete(socket.id);

      // Notify org members of offline status (if no other sockets for this user)
      const userStillOnline = Array.from(onlineUsers.values()).some((u) => u.userId === user.userId);
      if (!userStillOnline) {
        user.organizationIds.forEach((orgId: string) => {
          socket.to(`org:${orgId}`).emit('user:offline', { userId: user.userId });
        });
      }
    });
  });

  logger.info('✅ Socket.IO initialized');
};

// ===== EMIT HELPERS =====

export const emitToOrg = (organizationId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`org:${organizationId}`).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToDashboard = (organizationId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`dashboard:${organizationId}`).emit(event, data);
};

export const emitToProject = (projectId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

export const getOnlineUsersForOrg = (organizationId: string): string[] => {
  const online = new Set<string>();
  onlineUsers.forEach((user) => {
    if (user.organizationIds.includes(organizationId)) {
      online.add(user.userId);
    }
  });
  return Array.from(online);
};

export { io };
