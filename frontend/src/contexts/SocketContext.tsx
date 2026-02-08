import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { authStorage } from '../utils/authStorage';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token: authToken } = useAuth();

  const connect = useCallback(() => {
    const token = authStorage.getToken();
    if (!token) {
      console.warn('[SocketContext] No token found, cannot connect to WebSocket');
      return;
    }

    // Don't create multiple connections
    if (socket?.connected) {
      console.log('[SocketContext] Already connected');
      return;
    }

    console.log('[SocketContext] Connecting to WebSocket...');

    // Create socket connection
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const newSocket = io(`${apiUrl}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[SocketContext] Connected to WebSocket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SocketContext] Disconnected from WebSocket:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SocketContext] Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[SocketContext] Socket error:', error);
    });

    setSocket(newSocket);
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('[SocketContext] Disconnecting from WebSocket');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Connect when token is available, disconnect when logged out
  useEffect(() => {
    if (authToken && !socket?.connected) {
      connect();
    } else if (!authToken && socket) {
      disconnect();
    }
  }, [authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
