import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook para conectarse al servidor Socket.io y recibir
 * actualizaciones de cajones en tiempo real.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Conectado:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Desconectado');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /**
   * Suscribirse a actualizaciones de cajones.
   * Retorna función de limpieza.
   */
  const onSpaceUpdate = (callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('spaceUpdate', (data) => {
      setLastUpdate(data);
      callback(data);
    });

    socket.on('initialState', (spaces) => {
      callback({ type: 'INITIAL', spaces });
    });

    return () => {
      socket.off('spaceUpdate');
      socket.off('initialState');
    };
  };

  return { connected, lastUpdate, onSpaceUpdate, socket: socketRef.current };
}
