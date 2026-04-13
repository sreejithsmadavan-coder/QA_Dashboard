import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io('/', { autoConnect: false, transports: ['websocket','polling'] });
  }
  return socketInstance;
}

export function useSocket(events = {}) {
  const socket = getSocket();
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handlers = {};
    for (const [event, handler] of Object.entries(eventsRef.current)) {
      handlers[event] = (...args) => eventsRef.current[event]?.(...args);
      socket.on(event, handlers[event]);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, []);

  return socket;
}

export default useSocket;
