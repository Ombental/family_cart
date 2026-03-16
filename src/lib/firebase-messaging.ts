import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

const messaging = getMessaging(app);
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Check if browser supports notifications + service workers */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request notification permission from the user.
 * Wrapped in try/catch — can throw in restrictive environments.
 */
export async function requestNotificationPermission(): Promise<
  'granted' | 'denied' | 'default' | 'error'
> {
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('[FCM] Permission request failed:', err);
    return 'error';
  }
}

/**
 * Get FCM token and save to Firestore.
 * Uses token-derived doc ID for automatic dedup.
 * Catches getToken() failures gracefully (e.g., iOS Safari without home screen install).
 */
export async function registerFcmToken(userId: string): Promise<string | null> {
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await saveFcmToken(userId, token);
    }
    return token;
  } catch (err) {
    console.error('[FCM] Token registration failed:', err);
    return null;
  }
}

/**
 * Remove the current device's FCM token from Firestore.
 * Call on logout to stop notifications for this device.
 */
export async function removeFcmToken(userId: string): Promise<void> {
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      const tokenDocId = tokenToDocId(token);
      await deleteDoc(doc(db, 'users', userId, 'fcmTokens', tokenDocId));
    }
  } catch (err) {
    console.error('[FCM] Token removal failed:', err);
  }
}

/**
 * Subscribe to foreground messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { title?: string; body?: string }) => void
): () => void {
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
}

// ---- Internal helpers ----

/** Derive a deterministic Firestore doc ID from the token string (first 20 chars). */
function tokenToDocId(token: string): string {
  return token.substring(0, 20);
}

/** Write/update FCM token doc with setDoc merge (dedup). */
async function saveFcmToken(userId: string, token: string): Promise<void> {
  const tokenDocId = tokenToDocId(token);
  const tokenRef = doc(db, 'users', userId, 'fcmTokens', tokenDocId);
  await setDoc(
    tokenRef,
    {
      token,
      createdAt: serverTimestamp(),
      lastRefreshedAt: serverTimestamp(),
      userAgent: navigator.userAgent,
    },
    { merge: true }
  );
}
