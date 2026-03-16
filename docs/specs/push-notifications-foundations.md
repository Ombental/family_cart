# Push Notifications — Client-Side Foundations

## Context

FamilyCart is a real-time PWA where families coordinate grocery shopping across households. Currently, users only see updates when they have the app open on the relevant page (via Firestore `onSnapshot`). Push notifications will surface critical events — like "someone started shopping" or "your join request was approved" — even when the app is backgrounded or closed.

**Scope:** This sprint builds the **client-side foundation only** — service worker migration, FCM token registration, permission UX, and foreground message handling. Server-side automation (Cloud Functions for automated triggers) is deferred to a future sprint. The pipeline can be tested end-to-end using **Firebase Console > Cloud Messaging > Compose** manual sends.

---

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Service Worker strategy | Switch from `generateSW` to `injectManifest` | Need custom SW code for push event handling; single SW avoids scope conflicts |
| Push provider | Firebase Cloud Messaging (FCM) | Already in the stack (SDK installed, sender ID configured), free unlimited messages, Console test tool |
| Token storage | `/users/{userId}/fcmTokens/{tokenHash}` subcollection | Supports multiple devices per user; using token (or hash) as doc ID gives automatic dedup via `setDoc` merge and trivial deletion |
| Permission UX | Pre-prompt card before browser dialog | Avoids permanent "denied" from surprise browser prompt |
| Server-side | **Deferred** | Cloud Functions (Blaze plan) or external server decided in a future sprint |

---

## Future Notification Types (for reference — not in this sprint)

| Type | Trigger | Recipients |
|------|---------|------------|
| Trip Started | Trip doc created | All group members except starter |
| Join Request Received | JoinRequest doc created | Active shoppers on the trip |
| Join Request Resolved | JoinRequest status changed | The requesting user |
| Trip Completed | Trip status → complete | All group members except completer |
| Item Added During Trip | Item doc created while trip active | Active shoppers (not the adder) |

---

## Implementation Tasks

### Phase 1: Service Worker Migration

**1.1 — Switch vite-plugin-pwa to `injectManifest` mode**
- File: `vite.config.ts`
- Change to `strategies: 'injectManifest'`, set `srcDir: 'src'`, `filename: 'sw.ts'`
- Move `runtimeCaching` config into the custom SW file (injectManifest doesn't support it in plugin config)
- Move `globPatterns` into `injectManifest` key
- Keep `registerType: 'autoUpdate'`, `manifest`, `includeAssets` unchanged
- Add `workbox-precaching`, `workbox-routing`, `workbox-strategies` as explicit `devDependencies` in `package.json` (currently transitive deps of vite-plugin-pwa — direct imports from the custom SW require them to be declared explicitly)

**1.2 — Create custom service worker**
- New file: `src/sw.ts`
- Add `/// <reference lib="webworker" />` at the top for SW type definitions (`ServiceWorkerGlobalScope`, `self.__WB_MANIFEST`, etc.)
- Exclude `src/sw.ts` from `tsconfig.app.json` `include` (vite-plugin-pwa compiles it via its own Vite/Rollup pipeline; the main `tsc -b` must not type-check it against DOM lib)
- Call `self.skipWaiting()` and `clientsClaim()` (from `workbox-core`) — required for `registerType: 'autoUpdate'` to work; without these, existing users won't get the new SW until all tabs are closed
- Workbox precaching: `precacheAndRoute(self.__WB_MANIFEST)`
- Navigation route: `registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))`
- Firestore runtime cache: NetworkFirst strategy for `firestore.googleapis.com` — must faithfully reproduce existing config (50 entries, 24h TTL) to avoid offline regression
- Firebase Messaging: own `initializeApp(firebaseConfig)` using `import.meta.env` vars directly — **do NOT import from `src/lib/firebase.ts`** (that module calls `enableIndexedDbPersistence` which crashes in SW context)
- `getMessaging()` from `firebase/messaging/sw`
- `onBackgroundMessage()` handler (logs for now, custom display later)
- Note: `import.meta.env` substitution works because vite-plugin-pwa builds the SW through Vite

### Phase 2: FCM Client Library + Token Management

**2.1 — Add VAPID key env var**
- Files: `.env`, `.env.example`
- Add `VITE_FIREBASE_VAPID_KEY=<generated from Firebase Console>`
- User must generate this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Generate key pair

**2.2 — Export Firebase app instance**
- File: `src/lib/firebase.ts`
- Export `app` (currently `const app`, needs `export const app`)
- Required by `firebase-messaging.ts` to init messaging on the same app instance

**2.3 — Create FCM client library**
- New file: `src/lib/firebase-messaging.ts`
- `isNotificationSupported()` — checks `'Notification' in window && 'serviceWorker' in navigator`
- `requestNotificationPermission()` — wraps `Notification.requestPermission()` in try/catch (can throw in restrictive environments), returns `'granted' | 'denied' | 'default' | 'error'`
- `registerFcmToken(userId)` — calls `getToken(messaging, { vapidKey })`, saves to Firestore. Wraps `getToken()` in try/catch — on failure (e.g., iOS Safari without home screen install), logs error and returns gracefully without crashing
- `removeFcmToken(userId, token)` — deletes token doc from Firestore (for logout). Since doc ID is derived from token, no separate localStorage tracking needed — just call `getToken()` at logout to get current token and delete the matching doc
- `onForegroundMessage(callback)` — wraps `onMessage()` from `firebase/messaging`
- Internal `saveFcmToken(userId, token)` — uses `setDoc` with merge to `/users/{userId}/fcmTokens/{tokenHash}` where `tokenHash` is a deterministic ID derived from the token string (e.g., first 20 chars or a hash). This ensures dedup: repeated calls update `lastRefreshedAt` instead of creating duplicate docs

Token doc schema:
```
/users/{userId}/fcmTokens/{tokenHash}
  token: string
  createdAt: Timestamp
  lastRefreshedAt: Timestamp
  userAgent: string
```

**2.4 — Create notification types**
- New file: `src/types/notification.ts`
- `NotificationType` union: `'trip_started' | 'trip_completed' | 'join_request_received' | 'join_request_resolved' | 'item_added_during_trip'`
- Note: `NotificationPreferences` interface and per-type toggles deferred to server-side sprint (toggles are meaningless without automated sends)

**2.5 — Update Firestore security rules**
- File: `firestore.rules`
- Add match rule for `/users/{userId}/fcmTokens/{tokenId}` (permissive for pilot: `allow read, write: if true`)

### Phase 3: React Integration

**3.1 — Create `useNotifications` hook**
- New file: `src/hooks/useNotifications.ts`
- Exposes: `permissionStatus` (`'default' | 'granted' | 'denied' | 'unsupported'`), `isEnabled`, `requestPermission()`
- On mount: checks `Notification.permission`, syncs state
- On user change (login): if permission already granted, calls `registerFcmToken(userId)` to refresh token
- Sets up `onForegroundMessage()` → shows sonner toast with notification title/body
- Does NOT auto-prompt — waits for explicit user action

**3.2 — Integrate token lifecycle with auth**
- File: `src/hooks/useAuth.tsx`
- On logout: call `getToken()` to retrieve the current device's FCM token, then call `removeFcmToken(userId, token)` to delete the matching Firestore doc (no separate localStorage tracking needed since doc ID is derived from token)

### Phase 4: Permission UX

**4.1 — Create NotificationPrompt component**
- New file: `src/components/notifications/NotificationPrompt.tsx`
- Renders a dismissable Card on the HomePage
- Bell icon + "Enable notifications to know when someone starts shopping"
- "Enable" button → calls `requestPermission()` from `useNotifications`
- "Not now" link → sets `localStorage.setItem('familycart_notif_prompt_dismissed', 'true')`, hides card
- Display conditions: permission is `'default'` AND not dismissed AND notifications are supported
- Never shows if already granted, denied, or unsupported

**4.2 — Add NotificationPrompt to HomePage**
- File: `src/pages/HomePage.tsx`
- Render `<NotificationPrompt />` below the group list (non-intrusive position)

**4.3 — Add notification settings to ProfilePage**
- File: `src/pages/ProfilePage.tsx`
- New Card below the language toggle card
- Bell icon + "Notifications" header
- Shows current status: Enabled (green) / Disabled / Blocked (with help text)
- If permission is `'default'`: "Enable Notifications" button
- If permission is `'denied'`: help text explaining how to re-enable in browser/OS settings
- If permission is `'granted'`: green status indicator
- Note: per-type preference toggles deferred to server-side sprint (toggles are meaningless without automated sends)

**4.4 — Add i18n strings**
- File: `src/i18n/translations.ts` (en + he sections)
- Keys: `notifications.enableTitle`, `notifications.enableDescription`, `notifications.enable`, `notifications.notNow`, `notifications.enabled`, `notifications.disabled`, `notifications.blocked`, `notifications.blockedHelp`, `notifications.settings`

---

## Dependency Graph

```
Phase 1 (SW migration):
  1.1 → 1.2

Phase 2 (FCM library) — depends on 1.2:
  2.1 + 2.2 (parallel, no code deps)
  2.3 (depends on 2.1 + 2.2)
  2.4 (parallel, types only)
  2.5 (parallel, rules only)

Phase 3 (React hooks) — depends on 2.3:
  3.1 (depends on 2.3 + 2.4)
  3.2 (depends on 3.1)

Phase 4 (UX) — depends on 3.1:
  4.1 + 4.2 + 4.3 + 4.4 (parallel)
```

---

## Files Modified / Created

### Modified
| File | Change |
|------|--------|
| `vite.config.ts` | Switch to `injectManifest` strategy |
| `package.json` | Add `workbox-precaching`, `workbox-routing`, `workbox-strategies` to devDependencies |
| `tsconfig.app.json` | Exclude `src/sw.ts` from include (SW is compiled by vite-plugin-pwa's own pipeline) |
| `src/lib/firebase.ts` | Export `app` instance |
| `src/hooks/useAuth.tsx` | FCM token cleanup on logout |
| `src/pages/ProfilePage.tsx` | Add notification settings card |
| `src/pages/HomePage.tsx` | Add `<NotificationPrompt />` |
| `firestore.rules` | Add `fcmTokens` subcollection rules |
| `.env.example` | Add `VITE_FIREBASE_VAPID_KEY` |
| `src/i18n/translations.ts` | Add notification i18n strings (en + he) |

### Created
| File | Purpose |
|------|---------|
| `src/sw.ts` | Custom service worker (Workbox precaching + FCM push handling + skipWaiting/clientsClaim) |
| `src/lib/firebase-messaging.ts` | FCM client: token management, permission, foreground messages |
| `src/types/notification.ts` | NotificationType union (preferences deferred to server-side sprint) |
| `src/hooks/useNotifications.ts` | React hook: permission state, token lifecycle, foreground toasts |
| `src/components/notifications/NotificationPrompt.tsx` | Pre-prompt card for HomePage |

---

## Known Limitations (Pilot)

1. **Multiple tabs** — FCM `onMessage()` fires in every open tab; if the user has 3 tabs open, they get 3 sonner toasts for one foreground message. Acceptable for pilot; BroadcastChannel coordination can be added later.
2. **FCM token refresh** — FCM tokens can be rotated by the browser/SDK. This sprint registers tokens on login and permission grant but does not set up a periodic refresh listener. Stale tokens will fail silently (FCM returns `NotRegistered`); server-side sprint should handle token cleanup on send failure.
3. **iOS Safari** — Push notifications only work for PWAs added to the home screen (iOS 16.4+). `getToken()` failure in this scenario is caught and handled gracefully, but the user experience is limited to a generic error message rather than a step-by-step install guide.

---

## Verification Plan

1. **SW migration** — `npm run build` succeeds; DevTools > Application > Service Workers shows the new SW with precaching working; existing Firestore caching still functional
2. **Push subscription** — DevTools > Application > Service Workers > Push shows an active subscription after granting permission
3. **Token storage** — Login → grant permission → verify FCM token doc appears in Firestore at `/users/{userId}/fcmTokens/{tokenHash}`; refresh page → verify no duplicate doc created (same doc updated via `lastRefreshedAt`)
4. **Foreground message** — Firebase Console > Cloud Messaging > Send test message to specific FCM token → verify sonner toast appears in-app
5. **Background message** — Same test with app minimized/tab closed → verify system notification appears
6. **Permission UX** — Fresh browser profile → pre-prompt card shows on HomePage → "Enable" triggers browser dialog → after granting, card disappears → ProfilePage shows "Enabled" status
7. **Dismiss flow** — Click "Not now" → card disappears → reload → card stays hidden
8. **Denied flow** — Deny browser prompt → ProfilePage shows "Blocked" with help text → pre-prompt card never shows again
9. **Logout cleanup** — Logout → verify FCM token doc is deleted from Firestore
10. **Lint/test/build** — `npm run lint && npm test && npm run build` all pass

---

## Sprint Plan — Push Notifications Foundations (Sprint 12)

**Total: 38 SP** | 14 tasks across 4 phases | Single sprint

### Execution Waves

Tasks are grouped into sequential waves respecting the dependency graph. Tasks within a wave can be executed in parallel.

---

#### Wave 1 — Scaffolding (4 SP)

| # | Task | Size | SP | Blocked By | Files |
|---|------|------|----|------------|-------|
| 1.1 | Switch vite-plugin-pwa to `injectManifest` mode | M | 3 | — | `vite.config.ts`, `package.json` |
| 2.1 | Add VAPID key env var | S | 1 | — | `.env`, `.env.example` |

> **Gate:** `npm install` succeeds, build still works (even though SW will be broken until 1.2 lands — `injectManifest` requires the source file to exist). Can add a placeholder `src/sw.ts` with just `precacheAndRoute(self.__WB_MANIFEST)` to keep the build green.

---

#### Wave 2 — Service Worker + Parallel Groundwork (12 SP)

| # | Task | Size | SP | Blocked By | Files |
|---|------|------|----|------------|-------|
| 1.2 | Create custom service worker | L | 8 | 1.1 | `src/sw.ts`, `tsconfig.app.json` |
| 2.2 | Export Firebase app instance | S | 1 | — | `src/lib/firebase.ts` |
| 2.4 | Create notification types | S | 1 | — | `src/types/notification.ts` |
| 2.5 | Update Firestore security rules | S | 1 | — | `firestore.rules` |
| 4.4 | Add i18n strings (en + he) | S | 1 | — | `src/i18n/translations.ts` |

> **Gate:** `npm run build` passes. DevTools > Application > Service Workers shows the new custom SW with precaching active. Firestore runtime caching still functional (no offline regression). Tasks 2.2, 2.4, 2.5, 4.4 have zero dependencies and are pulled forward to maximize parallelism.

---

#### Wave 3 — FCM Client Library (5 SP)

| # | Task | Size | SP | Blocked By | Files |
|---|------|------|----|------------|-------|
| 2.3 | Create FCM client library | M | 5 | 1.2, 2.1, 2.2 | `src/lib/firebase-messaging.ts` |

> **Gate:** Library compiles. Manual smoke test: call `registerFcmToken()` from browser console → token doc appears in Firestore with correct `{tokenHash}` doc ID. Refresh → same doc updated, no duplicate.

---

#### Wave 4 — React Hooks (7 SP)

| # | Task | Size | SP | Blocked By | Files |
|---|------|------|----|------------|-------|
| 3.1 | Create `useNotifications` hook | M | 5 | 2.3, 2.4 | `src/hooks/useNotifications.ts` |
| 3.2 | Integrate token lifecycle with auth | S | 2 | 3.1 | `src/hooks/useAuth.tsx` |

> **Gate:** Login → permission already granted → FCM token registered automatically. Logout → token doc deleted from Firestore. Foreground message via Firebase Console → sonner toast appears.

---

#### Wave 5 — Permission UX (10 SP)

| # | Task | Size | SP | Blocked By | Files |
|---|------|------|----|------------|-------|
| 4.1 | Create NotificationPrompt component | M | 3 | 3.1, 4.4 | `src/components/notifications/NotificationPrompt.tsx` |
| 4.2 | Add NotificationPrompt to HomePage | S | 1 | 4.1 | `src/pages/HomePage.tsx` |
| 4.3 | Add notification settings to ProfilePage | M | 5 | 3.1, 4.4 | `src/pages/ProfilePage.tsx` |
| V | Full verification pass | S | 1 | 4.2, 4.3 | — |

> **Gate:** Full verification plan (all 10 checks). `npm run lint && npm test && npm run build` all green. Zero regressions.

---

### Summary

```
Wave 1 ▸▸░░░░░░░░░░░░░░░░░░  4 SP   Scaffolding
Wave 2 ▸▸▸▸▸▸▸▸▸▸▸▸░░░░░░░░ 12 SP   SW + groundwork
Wave 3 ▸▸▸▸▸░░░░░░░░░░░░░░░  5 SP   FCM library
Wave 4 ▸▸▸▸▸▸▸░░░░░░░░░░░░░  7 SP   React hooks
Wave 5 ▸▸▸▸▸▸▸▸▸▸░░░░░░░░░░ 10 SP   UX + verify
─────────────────────────────────────
Total                         38 SP
```

### Risk Callouts

| Risk | Mitigation |
|------|-----------|
| SW migration breaks existing PWA installs | Wave 2 gate requires manual DevTools verification before proceeding. `skipWaiting` + `clientsClaim` ensure takeover. |
| Firestore runtime cache regression | Wave 2 gate explicitly tests offline behavior. Config reproduced line-for-line from current `runtimeCaching`. |
| `tsc -b` fails on SW types | Task 1.2 includes `tsconfig.app.json` exclude + `/// <reference lib="webworker" />`. Verified at Wave 2 gate. |
| iOS Safari `getToken()` failure | Task 2.3 wraps in try/catch. Graceful degradation, not crash. |

---

## Task Breakdown

Concrete implementation instructions for each task. Each is self-contained enough for an agent to execute autonomously.

---

### Task 1.1 — Switch vite-plugin-pwa to `injectManifest` mode

**Wave:** 1 | **SP:** 3 | **Blocked by:** none

**File: `package.json`** — Add workbox devDependencies:
```bash
npm install -D workbox-precaching workbox-routing workbox-strategies workbox-core
```

**File: `vite.config.ts`** — Replace the `VitePWA({...})` config:

Current (lines 12-59):
```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  manifest: { /* ... keep as-is ... */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [ /* ... remove — moves to sw.ts ... */ ],
  },
}),
```

Change to:
```ts
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  manifest: { /* ... keep entire manifest block unchanged ... */ },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  },
}),
```

Key changes:
- Add `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`
- Remove the entire `workbox` key (including `globPatterns` and `runtimeCaching`)
- Add `injectManifest` key with `globPatterns` moved into it
- `manifest`, `registerType`, `includeAssets` stay unchanged

**Verification:** `npm install` succeeds. Build will fail until task 1.2 creates `src/sw.ts` — that's expected.

---

### Task 1.2 — Create custom service worker

**Wave:** 2 | **SP:** 8 | **Blocked by:** 1.1

**File: `tsconfig.app.json`** — Add `src/sw.ts` to the exclude array:

Current line 34:
```json
"exclude": ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.test.tsx"]
```
Change to:
```json
"exclude": ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.test.tsx", "src/sw.ts"]
```

**New file: `src/sw.ts`** — Create with this structure:

```ts
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare const self: ServiceWorkerGlobalScope;

// ---- Activate immediately for autoUpdate behavior ----
self.skipWaiting();
clientsClaim();

// ---- Workbox precaching ----
precacheAndRoute(self.__WB_MANIFEST);

// ---- SPA navigation fallback ----
const navHandler = createHandlerBoundToURL('index.html');
registerRoute(new NavigationRoute(navHandler));

// ---- Firestore runtime cache (reproduces existing generateSW config) ----
registerRoute(
  /^https:\/\/firestore\.googleapis\.com\/.*/i,
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// ---- Firebase Cloud Messaging ----
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  console.log('[SW] Background message received:', payload);
  // Custom notification display will be added in server-side sprint
});
```

**CRITICAL notes:**
- `self.skipWaiting()` + `clientsClaim()` are required for `registerType: 'autoUpdate'` to work
- The SW has its own `initializeApp()` — **never import from `src/lib/firebase.ts`** (it calls `enableIndexedDbPersistence` which crashes in SW context)
- `import.meta.env` substitution works because vite-plugin-pwa builds the SW through Vite
- The Firestore runtime cache config is reproduced exactly from the current `vite.config.ts` `runtimeCaching` (same regex, same `NetworkFirst`, same 50 entries / 24h TTL)
- `workbox-expiration` is a transitive dep available at runtime, but if it causes resolution issues add it to devDependencies too

**Verification:** `npm run build` (`tsc -b && vite build`) passes. DevTools > Application > Service Workers shows the new SW. Precaching works. Firestore offline caching still functional.

---

### Task 2.1 — Add VAPID key env var

**Wave:** 1 | **SP:** 1 | **Blocked by:** none

**File: `.env.example`** — Append after the `VITE_SESSION_VERSION` line:
```
# Firebase Cloud Messaging (Web Push)
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

**File: `.env`** — Add the actual VAPID key (user must generate from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Generate key pair):
```
VITE_FIREBASE_VAPID_KEY=<actual-key-here>
```

**Verification:** Env var is accessible via `import.meta.env.VITE_FIREBASE_VAPID_KEY` at build time.

---

### Task 2.2 — Export Firebase app instance

**Wave:** 2 | **SP:** 1 | **Blocked by:** none

**File: `src/lib/firebase.ts`** — Change line 13:

From:
```ts
const app = initializeApp(firebaseConfig);
```
To:
```ts
export const app = initializeApp(firebaseConfig);
```

One-line change. Nothing else in the file changes.

**Verification:** No build errors. Existing `db` export still works.

---

### Task 2.3 — Create FCM client library

**Wave:** 3 | **SP:** 5 | **Blocked by:** 1.2, 2.1, 2.2

**New file: `src/lib/firebase-messaging.ts`**

```ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { db } from '@/lib/firebase';

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
```

Key design decisions:
- `tokenToDocId()` uses first 20 chars of token — FCM tokens are ~150+ chars, first 20 is unique per device
- `setDoc` with `merge: true` means `createdAt` only sets on first write, `lastRefreshedAt` updates every time
- `removeFcmToken` calls `getToken()` internally to get the current token — no need for localStorage tracking
- All public functions have try/catch — never crash the app on FCM failures

**Verification:** Library compiles. Manual smoke test: import and call `registerFcmToken(userId)` → Firestore doc appears at `/users/{userId}/fcmTokens/{first20chars}`. Page refresh → same doc updated.

---

### Task 2.4 — Create notification types

**Wave:** 2 | **SP:** 1 | **Blocked by:** none

**New file: `src/types/notification.ts`**

```ts
/** Notification event types — used in message payloads and future preference toggles. */
export type NotificationType =
  | 'trip_started'
  | 'trip_completed'
  | 'join_request_received'
  | 'join_request_resolved'
  | 'item_added_during_trip';
```

Minimal — `NotificationPreferences` deferred to server-side sprint.

**Verification:** Compiles with no errors.

---

### Task 2.5 — Update Firestore security rules

**Wave:** 2 | **SP:** 1 | **Blocked by:** none

**File: `firestore.rules`** — Add inside the `/users/{userId}` match block (after the `groupMemberships` match, before the closing `}`), after line 51:

```
      // FCM token subcollection (push notifications)
      match /fcmTokens/{tokenId} {
        allow read, write: if true;
        // NOTE: Permissive for pilot. No Firebase Auth = no request.auth.uid.
        // TODO: allow read, write: if request.auth.uid == userId;
      }
```

Insert position — after the `groupMemberships` block (line 51) and before the closing `}` of the `/users/{userId}` match (line 52).

**Verification:** `firestore.rules` is syntactically valid. Deploy rules if applicable.

---

### Task 3.1 — Create `useNotifications` hook

**Wave:** 4 | **SP:** 5 | **Blocked by:** 2.3, 2.4

**New file: `src/hooks/useNotifications.ts`**

```ts
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

  // Sync permission status on mount / focus
  useEffect(() => {
    if (!isNotificationSupported()) return;
    setPermissionStatus(Notification.permission as PermissionStatus);
  }, []);

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
```

Key behavior:
- Does NOT auto-prompt — `requestPermission()` must be called explicitly by user action
- On login with existing permission → auto-refreshes FCM token
- Foreground messages → sonner toast (reuses existing sonner dependency)
- Hook is safe to call in non-supporting browsers (returns `'unsupported'`)

**Verification:** Hook compiles. Calling `requestPermission()` triggers browser dialog. After granting, FCM token appears in Firestore. Foreground messages show toast.

---

### Task 3.2 — Integrate token lifecycle with auth

**Wave:** 4 | **SP:** 2 | **Blocked by:** 3.1

**File: `src/hooks/useAuth.tsx`**

1. Add import at the top (after existing imports, ~line 29):
```ts
import { removeFcmToken, isNotificationSupported } from '@/lib/firebase-messaging';
```

2. Modify the `logout` callback (lines 115-118):

From:
```ts
const logout = useCallback(() => {
  clearSession();
  setUser(null);
}, []);
```

To:
```ts
const logout = useCallback(() => {
  // Clean up FCM token so this device stops receiving notifications
  if (user && isNotificationSupported() && Notification.permission === 'granted') {
    removeFcmToken(user.id).catch(() => {
      // Best-effort — don't block logout on FCM cleanup failure
    });
  }
  clearSession();
  setUser(null);
}, [user]);
```

Note: `removeFcmToken` is fire-and-forget — we don't await it to avoid blocking logout. The `.catch()` swallows errors silently. The `user` dependency is added to the `useCallback` deps array.

**Verification:** Logout → FCM token doc deleted from Firestore. If offline, logout still works immediately (FCM cleanup fails silently).

---

### Task 4.1 — Create NotificationPrompt component

**Wave:** 5 | **SP:** 3 | **Blocked by:** 3.1, 4.4

**New file: `src/components/notifications/NotificationPrompt.tsx`**

```tsx
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/i18n/LanguageContext';

const DISMISSED_KEY = 'familycart_notif_prompt_dismissed';

export function NotificationPrompt() {
  const { permissionStatus, requestPermission } = useNotifications();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  // Don't render if: already granted, denied, unsupported, or dismissed
  if (permissionStatus !== 'default' || dismissed) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{t('notifications.enableTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('notifications.enableDescription')}
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={requestPermission}>
                {t('notifications.enable')}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:underline"
                onClick={handleDismiss}
              >
                {t('notifications.notNow')}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

Uses existing `Card`, `Button`, `Bell` icon from current design system. Matches the visual style of existing cards on the HomePage.

**Verification:** Component renders on HomePage when permission is `'default'` and not dismissed. "Enable" triggers browser dialog. "Not now" hides card and persists across reloads. Never shows if already granted/denied/unsupported.

---

### Task 4.2 — Add NotificationPrompt to HomePage

**Wave:** 5 | **SP:** 1 | **Blocked by:** 4.1

**File: `src/pages/HomePage.tsx`**

1. Add import (after existing imports, ~line 9):
```ts
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';
```

2. Add `<NotificationPrompt />` below the group list, before the Create/Join options. Insert after the closing `)}` of the group list block (after line 77) and before the `{/* Create / Join options */}` comment (line 79):

```tsx
      {/* Notification opt-in prompt */}
      <NotificationPrompt />
```

Position: between the group cards and the Create/Join buttons — non-intrusive, visible but not blocking.

**Verification:** HomePage shows the prompt card in the correct position. Card disappears after granting or dismissing.

---

### Task 4.3 — Add notification settings to ProfilePage

**Wave:** 5 | **SP:** 5 | **Blocked by:** 3.1, 4.4

**File: `src/pages/ProfilePage.tsx`**

1. Add imports (after existing imports, ~line 9):
```ts
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
```

Note: `Bell` is from `lucide-react` which is already imported on line 3 — just add `Bell` to the existing destructure:
```ts
import { LogOut, Pencil, X, Check, Phone, User, Bell } from "lucide-react";
```

2. Add hook call inside the component (after the existing hook calls, ~line 18):
```ts
const { permissionStatus, requestPermission } = useNotifications();
```

3. Add a new Card between the Language toggle card (ends at line 168) and the Logout button (line 171). Insert after `</Card>` on line 168:

```tsx
      {/* Notifications */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Bell className="h-3 w-3" />
            {t('notifications.settings')}
          </label>

          {permissionStatus === 'granted' && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm">{t('notifications.enabled')}</p>
            </div>
          )}

          {permissionStatus === 'default' && (
            <Button variant="outline" className="w-full" onClick={requestPermission}>
              {t('notifications.enable')}
            </Button>
          )}

          {permissionStatus === 'denied' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <p className="text-sm">{t('notifications.blocked')}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('notifications.blockedHelp')}
              </p>
            </div>
          )}

          {permissionStatus === 'unsupported' && (
            <p className="text-sm text-muted-foreground">{t('notifications.disabled')}</p>
          )}
        </CardContent>
      </Card>
```

Visual style matches existing cards (same `CardContent`, spacing, label pattern as Language card).

**Verification:** ProfilePage shows notification card. Shows green dot + "Enabled" when granted. Shows "Enable" button when default. Shows red dot + "Blocked" + help text when denied. Shows "Disabled" when unsupported.

---

### Task 4.4 — Add i18n strings (en + he)

**Wave:** 2 | **SP:** 1 | **Blocked by:** none

**File: `src/i18n/translations.ts`**

1. In the `en` object, add after the `"profile.language"` line (line 270) and before the `// ---- offline ----` comment (line 272):

```ts
  // ---- notifications ----
  "notifications.enableTitle": "Stay in the loop",
  "notifications.enableDescription": "Get notified when someone starts shopping or your join request is approved.",
  "notifications.enable": "Enable Notifications",
  "notifications.notNow": "Not now",
  "notifications.enabled": "Notifications enabled",
  "notifications.disabled": "Notifications not supported",
  "notifications.blocked": "Notifications blocked",
  "notifications.blockedHelp": "To re-enable, open your browser or device settings and allow notifications for FamilyCart.",
  "notifications.settings": "Notifications",
```

2. In the `he` object, add after the `"profile.language"` line (line 561) and before the `// ---- offline ----` comment (line 563):

```ts
  // ---- notifications ----
  "notifications.enableTitle": "הישארו מעודכנים",
  "notifications.enableDescription": "קבלו התראה כשמישהו מתחיל קניות או כשבקשת ההצטרפות שלכם אושרה.",
  "notifications.enable": "הפעלת התראות",
  "notifications.notNow": "לא עכשיו",
  "notifications.enabled": "התראות מופעלות",
  "notifications.disabled": "התראות לא נתמכות",
  "notifications.blocked": "התראות חסומות",
  "notifications.blockedHelp": "כדי להפעיל מחדש, פתחו את הגדרות הדפדפן או המכשיר ואפשרו התראות עבור FamilyCart.",
  "notifications.settings": "התראות",
```

**Verification:** All 9 keys present in both `en` and `he`. No missing keys. Build compiles.

---

### Task V — Full verification pass

**Wave:** 5 | **SP:** 1 | **Blocked by:** 4.2, 4.3

Run all 10 verification checks from the Verification Plan section, plus:

```bash
npm run lint && npm test && npm run build
```

All must pass with zero regressions. If any existing test breaks, fix it before marking complete.
