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
    if (!user) return;

    const isNative = Capacitor.isNativePlatform();

    const setup = async () => {
      try {
        if (isNative) {
          const perm = await LocalNotifications.requestPermissions();
          readyRef.current = perm.display === 'granted';
        } else if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            readyRef.current = true;
          } else if (Notification.permission !== 'denied' && window.top === window.self) {
            const p = await Notification.requestPermission();
            readyRef.current = p === 'granted';
          }
        }
      } catch {
        readyRef.current = false;
      }
    };
    setup();

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
          const msg = payload.new as { content?: string; sender_id?: string };
          const body = (msg.content || 'New message').slice(0, 120);

          // Don't notify while the user is actively looking at the app
          if (document.visibilityState === 'visible' && !isNative) return;

          try {
            if (isNative && readyRef.current) {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: Date.now() % 2147483647,
                    title: 'New message — FF ID Hub',
                    body,
                    smallIcon: 'ic_stat_notify',
                  },
                ],
              });
            } else if (!isNative && readyRef.current) {
              new Notification('New message — FF ID Hub', { body });
            }
          } catch {
            // notification delivery is best-effort
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
