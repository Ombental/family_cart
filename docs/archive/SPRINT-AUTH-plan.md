# Sprint Plan: US-AUTH — User Registration, Login & Profile

**Total: 46 SP**
**Spec:** [US-AUTH-user-registration-login-profile.md](./US-AUTH-user-registration-login-profile.md)

## Work Items

| # | Work Item | Story | Size | Depends On | Description |
|---|-----------|-------|------|------------|-------------|
| 1 | Create `users` Firestore collection & data layer | US-AUTH-01 | M (5 SP) | — | Create `src/lib/firestore-users.ts` with `createUser`, `getUserByPhone`, `updateUserName`. Define `User` type. Add Firestore security rules. |
| 2 | Build session manager | US-AUTH-03 | M (5 SP) | — | Create `src/lib/session.ts` — store session in localStorage with 7-day TTL. Functions: `saveSession`, `getSession`, `clearSession`, `isSessionValid`. |
| 3 | Create `useAuth` hook | US-AUTH-01, 02, 03 | M (5 SP) | 1, 2 | Create `src/hooks/useAuth.ts` — wraps session + Firestore user. Provides `user`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout`. Context provider at app root. |
| 4 | Build Registration page | US-AUTH-01 | M (5 SP) | 3 | Create `src/pages/RegisterPage.tsx` — phone number + display name form. Validates uniqueness, calls `register()`, navigates to home. |
| 5 | Build Login page | US-AUTH-02 | M (3 SP) | 3 | Create `src/pages/LoginPage.tsx` — phone number field. Looks up user, calls `login()`, shows error with register link if not found. |
| 6 | Build Profile page | US-AUTH-04, 05 | M (5 SP) | 3 | Create `src/pages/ProfilePage.tsx` — shows phone (read-only), editable name, logout button. Enable Profile tab in BottomNav. |
| 7 | Add auth routing & guards | US-AUTH-02, 03 | M (5 SP) | 3, 4, 5, 6 | Wrap routes with auth guard — unauthenticated users see Login. Add `/login`, `/register`, `/profile` routes. Handle session expiry redirect. |
| 8 | Migrate identity system | US-AUTH-01 | L (8 SP) | 7 | Replace `useHousehold` localStorage identity with `useAuth` user identity throughout the app. Update `householdId`/`householdName` references to use the authenticated user. Ensure backward compatibility for existing Firestore data. |
| 9 | Tests | All | M (5 SP) | 8 | Unit tests for session manager, firestore-users, useAuth hook. Integration tests for login/register/profile flows. |

## Dependency Graph

```
  ┌───┐  ┌───┐
  │ 1 │  │ 2 │       Independent — run in parallel
  └─┬─┘  └─┬─┘
    │      │
    └──┬───┘
       ▼
     ┌───┐
     │ 3 │            useAuth hook (needs both 1 & 2)
     └─┬─┘
       │
   ┌───┼───┐
   ▼   ▼   ▼
 ┌───┐┌───┐┌───┐
 │ 4 ││ 5 ││ 6 │     Pages — run in parallel
 └─┬─┘└─┬─┘└─┬─┘
   │    │    │
   └────┼────┘
        ▼
      ┌───┐
      │ 7 │           Auth routing (needs all pages)
      └─┬─┘
        ▼
      ┌───┐
      │ 8 │           Migration (needs routing in place)
      └─┬─┘
        ▼
      ┌───┐
      │ 9 │           Tests (needs everything stable)
      └───┘
```
