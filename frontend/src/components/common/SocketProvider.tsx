'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, string[]>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  onlineUsers: {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('users:online', (data: Record<string, string[]>) => {
      setOnlineUsers(data);
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((orgId) => {
          if (!updated[orgId].includes(userId)) {
            updated[orgId] = [...updated[orgId], userId];
          }
        });
        return updated;
      });
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((orgId) => {
          updated[orgId] = updated[orgId].filter((id) => id !== userId);
        });
        return updated;
      });
    });

    // Global notification handler
    socket.on('notification:new', (notification: any) => {
      toast(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, accessToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
