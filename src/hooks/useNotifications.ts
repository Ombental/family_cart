import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  isNotificationSupported,
  requestNotificationPermission,
  registerFcmToken,
  onForegroundMessage,
} from '@/lib/firebase-messaging';
import { useAuth } from '@/hooks/useAuth';

type PermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export function useNotifications() {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(() => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission as PermissionStatus;
  });

  const foregroundUnsubRef = useRef<(() => void) | null>(null);

  // On login with permission already granted → register/refresh token
  useEffect(() => {
    if (!user || permissionStatus !== 'granted') return;
    registerFcmToken(user.id);
  }, [user, permissionStatus]);

  // Set up foreground message handler → sonner toast
  useEffect(() => {
    if (!isNotificationSupported() || permissionStatus !== 'granted') return;

    foregroundUnsubRef.current = onForegroundMessage(({ title, body }) => {
      toast(title ?? 'Notification', {
        description: body,
      });
    });

    return () => {
      foregroundUnsubRef.current?.();
      foregroundUnsubRef.current = null;
    };
  }, [permissionStatus]);

  // Request permission → register token if granted
  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) return;

    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setPermissionStatus('granted');
      if (user) {
        await registerFcmToken(user.id);
      }
    } else if (result === 'denied') {
      setPermissionStatus('denied');
    }
    // 'default' or 'error' — permission unchanged
  }, [user]);

  return {
    permissionStatus,
    isEnabled: permissionStatus === 'granted',
    requestPermission,
  };
}
