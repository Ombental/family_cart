/// <reference lib="webworker" />

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
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

  const title = payload.notification?.title ?? 'FamilyCart';
  const options: NotificationOptions = {
    body: payload.notification?.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});
