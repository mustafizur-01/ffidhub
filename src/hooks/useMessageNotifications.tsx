import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Shows a phone notification when a new message arrives (native APK).
// On web, falls back to the browser Notification API when permitted.
export const useMessageNotifications = () => {
  const { user } = useAuth();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!user) {
      readyRef.current = false;
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    let disposed = false;
    let isConnected = false;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const stopListening = () => {
      isConnected = false;
      const channel = activeChannel;
      activeChannel = null;
      if (channel) void supabase.removeChannel(channel);
    };

    const startListening = () => {
      if (disposed || !navigator.onLine || activeChannel) return;

      const channel = supabase
        .channel(`message-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          async (payload) => {
            // Only alert for events received through a live, online connection.
            if (!isConnected || !navigator.onLine) return;

            const msg = payload.new as { content?: string; sender_id?: string };
            const body = (msg.content || 'New message').slice(0, 120);

            // Don't notify while the user is actively looking at the web app.
            if (document.visibilityState === 'visible' && !isNative) return;

            try {
              if (isNative && readyRef.current && navigator.onLine) {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: Date.now() % 2147483647,
                      title: 'New message — FF ID Hub',
                      body,
                      smallIcon: 'ic_launcher',
                    },
                  ],
                });
              } else if (!isNative && readyRef.current && navigator.onLine) {
                new Notification('New message — FF ID Hub', { body });
              }
            } catch {
              // Notification delivery is best-effort.
            }
          }
        );

      activeChannel = channel;
      channel.subscribe((status) => {
        if (activeChannel !== channel) return;
        isConnected = status === 'SUBSCRIBED' && navigator.onLine;
      });
    };

    const setup = async () => {
      try {
        if (isNative) {
          const perm = await LocalNotifications.requestPermissions();
          readyRef.current = !disposed && perm.display === 'granted';
        } else if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            readyRef.current = !disposed;
          } else if (Notification.permission !== 'denied' && window.top === window.self) {
            const p = await Notification.requestPermission();
            readyRef.current = !disposed && p === 'granted';
          }
        }
      } catch {
        readyRef.current = false;
      }
    };
    const handleOnline = () => startListening();
    const handleOffline = () => stopListening();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    startListening();
    void setup();

    return () => {
      disposed = true;
      readyRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopListening();
    };
  }, [user]);
};
