import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

let _messaging: Messaging | null = null;
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const TOKEN_STORAGE_KEY = 'familycart_fcm_token_hash';

function getMessagingInstance(): Messaging {
  if (!_messaging) {
    _messaging = getMessaging(app);
  }
  return _messaging;
}

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
    const token = await getToken(getMessagingInstance(), { vapidKey: VAPID_KEY });
    if (token) {
      await saveFcmToken(userId, token);
      // Store token hash locally so logout can delete without a network call
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenToDocId(token));
    }
    return token;
  } catch (err) {
    console.error('[FCM] Token registration failed:', err);
    return null;
  }
}

/**
 * Remove the current device's FCM token from Firestore.
 * Uses locally cached token hash to avoid an unnecessary getToken() network call.
 */
export async function removeFcmToken(userId: string): Promise<void> {
  try {
    const tokenDocId = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (tokenDocId) {
      await deleteDoc(doc(db, 'users', userId, 'fcmTokens', tokenDocId));
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  return onMessage(getMessagingInstance(), (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
}

// ---- Internal helpers ----

/** Derive a deterministic Firestore doc ID from the token using a simple hash. */
function tokenToDocId(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to unsigned hex string for a clean doc ID
  return (hash >>> 0).toString(16);
}

/** Write/update FCM token doc. Sets createdAt only on first write. */
async function saveFcmToken(userId: string, token: string): Promise<void> {
  const tokenDocId = tokenToDocId(token);
  const tokenRef = doc(db, 'users', userId, 'fcmTokens', tokenDocId);
  const existing = await getDoc(tokenRef);

  const data: Record<string, unknown> = {
    token,
    lastRefreshedAt: serverTimestamp(),
    userAgent: navigator.userAgent,
  };
  if (!existing.exists()) {
    data.createdAt = serverTimestamp();
  }

  await setDoc(tokenRef, data, { merge: true });
}
