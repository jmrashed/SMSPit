import { useEffect, useRef } from 'react';
import { getWebSocketUrl } from '../api/client';

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

interface RealtimeEvent {
  event: string;
}

// Subscribes to sms-service's WebSocket feed for the lifetime of the
// component and calls onMessageCreated whenever a message is captured
// (or replayed) elsewhere. Reconnects with exponential backoff on
// disconnect so a restarted sms-service is picked back up automatically.
export function useMessageSocket(onMessageCreated: () => void): void {
  const onMessageCreatedRef = useRef(onMessageCreated);
  onMessageCreatedRef.current = onMessageCreated;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    let cancelled = false;

    function connect() {
      socket = new WebSocket(getWebSocketUrl());

      socket.onopen = () => {
        reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          if (parsed.event === 'sms.messages.created') {
            onMessageCreatedRef.current();
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message', error);
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
