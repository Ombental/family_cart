# FamilyCart — Deployment Guide

**Version:** 1.0
**Date:** February 23, 2026
**Audience:** Engineers deploying FamilyCart to Firebase for the design partner pilot

This document walks through every step required to go from a fresh clone to a running deployment. Follow it top-to-bottom. Do not skip sections.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Firebase Project Setup](#2-firebase-project-setup)
3. [Firebase CLI Initialization](#3-firebase-cli-initialization)
4. [Environment Variables](#4-environment-variables)
5. [Firestore Database Configuration](#5-firestore-database-configuration)
6. [Cloud Functions Deployment](#6-cloud-functions-deployment)
7. [Frontend Build and Deployment](#7-frontend-build-and-deployment)
8. [Household Identity](#8-household-identity)
9. [PWA Assets](#9-pwa-assets)
10. [Verification Checklist](#10-verification-checklist)
11. [Local Development](#11-local-development)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install these before proceeding.

| Tool | Min Version | Install |
|---|---|---|
| Node.js | 22.x | [nodejs.org](https://nodejs.org/) or `nvm install 22` |
| npm | 10.x | Ships with Node.js 22 |
| Firebase CLI | 13.x+ | `npm install -g firebase-tools` |
| Git | 2.x | [git-scm.com](https://git-scm.com/) |

Verify installations:

```bash
node --version    # v22.x.x
npm --version     # 10.x.x
firebase --version # 13.x.x+
```

---

## 2. Firebase Project Setup

### 2.1 Create the Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Name it (e.g. `familycart-pilot`)
4. Disable Google Analytics (not needed for the pilot)
5. Click **Create project**

### 2.2 Register a Web App

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, click the web icon (`</>`)
3. Register the app with nickname `FamilyCart Web`
4. **Do not** enable Firebase Hosting at this step (we handle it via CLI)
5. Copy the `firebaseConfig` object — you will need these values for the `.env` file:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "familycart-pilot.firebaseapp.com",
  projectId: "familycart-pilot",
  storageBucket: "familycart-pilot.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 2.3 Enable Firestore

1. In the Firebase Console, go to **Build > Firestore Database**
2. Click **Create database**
3. Choose **production mode** (we will set rules manually)
4. Select a region close to your pilot users (e.g. `us-central1`, `europe-west1`)
5. Click **Enable**

> **Important:** Remember the region you chose. Cloud Functions must deploy to the same region for lowest latency.

### 2.4 Upgrade to Blaze Plan

Scheduled Cloud Functions require the **Blaze (pay-as-you-go)** plan. The free Spark plan does not support scheduled functions.

1. In the Firebase Console, go to **Usage and billing > Details & settings**
2. Click **Modify plan** and select **Blaze**
3. Add a billing account

> Pilot-scale usage will stay well within the free tier limits. The Blaze plan is required only for the scheduler feature, not because of volume.

---

## 3. Firebase CLI Initialization

### 3.1 Authenticate

```bash
firebase login
```

This opens a browser for Google account authentication. Use the account that owns the Firebase project.

### 3.2 Link the Project

From the repository root:

```bash
firebase use --add
```

Select your project (e.g. `familycart-pilot`) and give it an alias (e.g. `default`).

This creates `.firebaserc`:

```json
{
  "projects": {
    "default": "familycart-pilot"
  }
}
```

### 3.3 Create `firebase.json`

Create `firebase.json` at the repository root with this content:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      },
      {
        "source": "/manifest.webmanifest",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/manifest+json"
          }
        ]
      }
    ]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log", "*.local"],
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ]
}
```

Key points:
- **`hosting.public: "dist"`** — Vite outputs the production build to `dist/`
- **`hosting.rewrites`** — SPA catch-all sends all routes to `index.html` (required for React Router)
- **`hosting.headers`** — Service worker must not be cached by CDN; manifest needs correct MIME type
- **`functions.predeploy`** — Auto-compiles TypeScript before deploying functions

---

## 4. Environment Variables

### 4.1 File Structure

| File | Committed? | Purpose |
|---|---|---|
| `.env.example` | Yes | Template with placeholder values |
| `.env` | **No** (gitignored) | Firebase config for local dev and build |
| `.env.local` | **No** (gitignored) | Optional local overrides |

### 4.2 Create Your `.env` File

Copy the template and fill in real values from step 2.2:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project credentials:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyD...your_actual_key
VITE_FIREBASE_AUTH_DOMAIN=familycart-pilot.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=familycart-pilot
VITE_FIREBASE_STORAGE_BUCKET=familycart-pilot.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### 4.3 Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (`<project>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket (`<project>.appspot.com`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |

### 4.4 How Environment Variables Are Used

All variables use the `VITE_` prefix, which tells Vite to expose them to the frontend bundle via `import.meta.env`. They are baked into the build at compile time — they are **not** runtime secrets.

- **Firebase config** (`src/lib/firebase.ts`): Initializes the Firebase SDK client

> **Note:** Household identity is not sourced from env vars. The `useHousehold` hook reads the household ID and name from `localStorage`, where they are persisted after the user completes the in-app setup flow.

> **Security note:** Firebase Web API keys are safe to include in the frontend bundle. They identify the project but do not grant write access — that is controlled by Firestore Security Rules. Do not confuse them with service account keys, which must never be committed.

---

## 5. Firestore Database Configuration

### 5.1 Security Rules

Create `firestore.rules` at the repository root:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Groups: readable and writable by anyone (pilot — no auth)
    match /groups/{groupId} {
      allow read, write: if true;

      // Households subcollection
      match /households/{householdId} {
        allow read, write: if true;
      }

      // Items subcollection
      match /items/{itemId} {
        allow read, write: if true;
      }

      // Trips subcollection
      match /trips/{tripId} {
        allow read, write: if true;
      }
    }
  }
}
```

> **Pilot-only rules.** These rules are wide open because the pilot has no authentication. When real auth ships, lock these down to authenticated users with group membership checks.

### 5.2 Composite Indexes

Create `firestore.indexes.json` at the repository root:

```json
{
  "indexes": [
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "deleted", "order": "ASCENDING" },
        { "fieldPath": "deletedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "items",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "deleted", "order": "ASCENDING" },
        { "fieldPath": "deletedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "trips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "trips",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

These indexes support:
1. **`purgeDeletedItems`** Cloud Function: queries `deleted == true` + `deletedAt < cutoff` across all groups
2. **`purgeExpiredSummaries`** Cloud Function: queries `status == "complete"` + `completedAt < cutoff` across all groups
3. **Trip history**: queries completed trips ordered by completion date

### 5.3 Deploy Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Or deploy both at once:

```bash
firebase deploy --only firestore
```

> Index creation takes 1-5 minutes. Check progress in Firebase Console under **Firestore > Indexes**.

---

## 6. Cloud Functions Deployment

### 6.1 Install Dependencies

```bash
cd functions
npm install
cd ..
```

### 6.2 Build Functions

```bash
cd functions
npm run build
cd ..
```

This compiles TypeScript to `functions/lib/`. Verify the output exists:

```bash
ls functions/lib/
# Should show: index.js  purgeDeletedItems.js  purgeExpiredSummaries.js
```

### 6.3 Deploy Functions

```bash
firebase deploy --only functions
```

This deploys two scheduled Cloud Functions:

| Function | Schedule | Purpose |
|---|---|---|
| `purgeDeletedItems` | Every 1 minute | Permanently removes soft-deleted items after 10s grace period |
| `purgeExpiredSummaries` | Every 24 hours | Deletes completed trip summaries older than 30 days |

### 6.4 Verify Functions

```bash
firebase functions:log
```

Or check the Firebase Console under **Functions** to confirm both functions appear as deployed.

> **Note:** Scheduled functions use Google Cloud Scheduler under the hood. The first deploy creates the scheduler jobs automatically. You can view them in the [Google Cloud Console](https://console.cloud.google.com/cloudscheduler) if needed.

---

## 7. Frontend Build and Deployment

### 7.1 Install Dependencies

```bash
npm install
```

### 7.2 Run Tests

```bash
npm test
```

All 94 tests should pass. Do not deploy if tests fail.

### 7.3 Build for Production

```bash
npm run build
```

This runs `tsc -b && vite build` which:
1. Type-checks all TypeScript
2. Bundles the React app into `dist/`
3. Generates the PWA service worker (`dist/sw.js`)
4. Generates the web app manifest (`dist/manifest.webmanifest`)

### 7.4 Preview Locally (Optional)

```bash
npm run preview
```

Opens the production build at `http://localhost:4173`. Verify routing, PWA install prompt, and basic functionality.

### 7.5 Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

The CLI uploads `dist/` to Firebase Hosting. On completion, it prints the live URL:

```
Hosting URL: https://familycart-pilot.web.app
```

### 7.6 Deploy Everything at Once

To deploy hosting, functions, and Firestore rules/indexes in a single command:

```bash
npm run build && firebase deploy
```

---

## 8. Household Identity

Household identity is handled dynamically via the app's setup flow. Users enter a household name on the home page, which generates a UUID via `crypto.randomUUID()` and persists both values in localStorage. No env vars or seed scripts are needed.

---

## 9. PWA Assets

The PWA configuration in `vite.config.ts` references icon files that must exist in `public/`:

| File | Size | Required |
|---|---|---|
| `public/pwa-192x192.png` | 192x192 px | Yes |
| `public/pwa-512x512.png` | 512x512 px | Yes |
| `public/apple-touch-icon.png` | 180x180 px | Recommended |
| `public/favicon.ico` | 32x32 px | Yes |
| `public/mask-icon.svg` | Any | Recommended (Safari) |

If these files are missing, the PWA will still work but will show broken icon placeholders on mobile home screens.

Generate icons from a source image using a tool like [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/).

---

## 10. Verification Checklist

After deployment, verify each item:

### Firestore

- [ ] Firestore database is created and accessible
- [ ] Security rules are deployed (check Firebase Console > Firestore > Rules)
- [ ] Composite indexes are created and status shows "Enabled" (check Firestore > Indexes)

### Cloud Functions

- [ ] `purgeDeletedItems` appears in Firebase Console > Functions
- [ ] `purgeExpiredSummaries` appears in Firebase Console > Functions
- [ ] Both show "Active" status with the correct schedule
- [ ] `firebase functions:log` shows no deployment errors

### Frontend

- [ ] Hosted URL loads without errors (`https://<project>.web.app`)
- [ ] Creating a group works (writes to Firestore)
- [ ] Joining a group with an invite code works
- [ ] Adding items appears in real-time across browser tabs
- [ ] Shopper Mode opens with blue theme and progress bar
- [ ] Completing a trip navigates to the green Trip Summary page
- [ ] Service worker registers (check Chrome DevTools > Application > Service Workers)
- [ ] App is installable as PWA (check the install icon in the address bar)

### Offline

- [ ] Airplane mode: previously loaded items are still visible
- [ ] Check-off works offline (toggle item status)
- [ ] Reconnecting syncs offline changes

---

## 11. Local Development

### 11.1 Development Server

```bash
npm run dev
```

Starts the Vite dev server at `http://localhost:5173` with hot module replacement.

### 11.2 Run Tests

```bash
npm test            # Single run
npm run test:watch  # Watch mode
```

### 11.3 Lint

```bash
npm run lint
```

### 11.4 Firebase Emulators (Optional)

To test Cloud Functions locally without hitting the production project:

```bash
# In the functions/ directory
cd functions
npm run serve
```

This starts the Firebase Functions emulator. Note: the emulator does not support scheduled triggers — you will need to invoke functions manually via the shell:

```bash
cd functions
npm run shell
# In the shell:
purgeDeletedItems()
```

---

## 12. Troubleshooting

### "Firebase project not found"

```
Error: No Firebase project specified
```

Run `firebase use --add` and select your project, or verify `.firebaserc` exists with the correct project ID.

### "Permission denied" on Firestore

Check that:
1. Firestore security rules are deployed (`firebase deploy --only firestore:rules`)
2. Rules allow read/write (for the pilot, rules should be `allow read, write: if true;`)
3. The `VITE_FIREBASE_PROJECT_ID` in `.env` matches the Firebase project

### "Functions deployment failed"

```
Error: Failed to deploy functions
```

1. Verify you are on the Blaze plan (scheduled functions require it)
2. Run `cd functions && npm run build` — fix any TypeScript errors
3. Check that `functions/lib/` contains compiled `.js` files
4. Ensure Node 22 is active: `node --version`

### "Index not ready"

```
FAILED_PRECONDITION: The query requires an index
```

Firestore indexes take 1-5 minutes to build after deployment. Wait and retry. Check status in Firebase Console > Firestore > Indexes.

### Service Worker Not Updating

The PWA uses `registerType: 'autoUpdate'` which means the service worker updates automatically. If changes are not reflecting:

1. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Clear site data: Chrome DevTools > Application > Storage > Clear site data
3. Verify `firebase.json` has the `Cache-Control: no-cache` header on `/sw.js`

### "enableIndexedDbPersistence" Warning

```
Offline persistence unavailable: multiple tabs open
```

This is expected behavior. Firestore offline persistence only works in one tab at a time. The warning is informational — the app continues to function normally without offline support in additional tabs.

---

## Quick Reference: Full Deployment Commands

```bash
# 1. Install all dependencies
npm install && cd functions && npm install && cd ..

# 2. Create and configure .env (see Section 4)
cp .env.example .env
# Edit .env with your Firebase credentials

# 3. Initialize Firebase project link
firebase login
firebase use --add

# 4. Deploy Firestore rules and indexes
firebase deploy --only firestore

# 5. Deploy Cloud Functions
firebase deploy --only functions

# 6. Build and deploy frontend
npm run build
firebase deploy --only hosting

# Or deploy everything at once:
npm run build && firebase deploy
```

---

*FamilyCart Deployment Guide v1.0 February 23, 2026*
