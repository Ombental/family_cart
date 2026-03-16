# US-AUTH: User Registration, Login & Profile

## Context

Design partners identified user management as the top priority. The current localStorage-based household identity has no real user concept — anyone on the device is "the user." This spec introduces a user model backed by Firestore with phone-number-based login (no SMS verification), persistent sessions, and profile editing.

## User Stories

### US-AUTH-01: Registration

**As a** new user,
**I want to** register with my phone number and name,
**so that** I have a persistent identity across devices.

**Acceptance Criteria:**
- [ ] User sees a registration screen with phone number and display name fields
- [ ] Phone number is a free-text input (no country restriction or auto-prefixing)
- [ ] Phone number must be unique — if already registered, user is prompted to log in instead
- [ ] Display name is required (non-empty, trimmed)
- [ ] On successful registration, a user document is created in Firestore `users` collection
- [ ] User is automatically logged in after registration
- [ ] Session token is persisted locally (survives app close/reopen)

### US-AUTH-02: Login

**As a** returning user,
**I want to** log in with just my phone number,
**so that** I can access my data on any device.

**Acceptance Criteria:**
- [ ] User sees a login screen with a phone number field
- [ ] If the phone number exists in Firestore, user is logged in immediately (no password, no OTP)
- [ ] If the phone number does not exist, user is shown an error with a link to register
- [ ] On successful login, user's display name and ID are loaded from Firestore
- [ ] Session token is persisted locally with a 7-day TTL
- [ ] User can be logged in on multiple devices/browsers simultaneously
- [ ] Each device maintains its own independent session

### US-AUTH-03: Session Persistence & Expiry

**As a** logged-in user,
**I want to** stay logged in for at least a week without re-entering my phone number,
**so that** I don't have to log in every time I open the app.

**Acceptance Criteria:**
- [ ] Session persists across app close, browser refresh, and device restart
- [ ] Session is valid for 7 days from last login
- [ ] After 7 days, session expires automatically
- [ ] On expired session, user sees the login screen (no error — just the normal login flow)
- [ ] Logging in again resets the 7-day TTL

### US-AUTH-04: Profile View & Edit

**As a** logged-in user,
**I want to** view and edit my display name,
**so that** other household members see my correct name.

**Acceptance Criteria:**
- [ ] Profile screen shows the user's phone number (read-only) and display name (editable)
- [ ] User can update their display name (non-empty, trimmed)
- [ ] Name change is saved to Firestore immediately
- [ ] Name change is reflected everywhere the user's name appears (e.g., item attribution)
- [ ] Profile screen is accessible from the bottom navigation

### US-AUTH-05: Logout

**As a** logged-in user,
**I want to** log out manually,
**so that** I can switch accounts or secure a shared device.

**Acceptance Criteria:**
- [ ] Logout button is available on the profile screen
- [ ] Logging out clears the local session
- [ ] After logout, user sees the login screen
- [ ] Logging out on one device does not affect sessions on other devices

## Data Model

```
users/{userId}
  phoneNumber: string        // unique identifier for login
  displayName: string        // editable display name
  createdAt: Timestamp
  updatedAt: Timestamp
```

## Auth Flow

```
                    ┌─────────────┐
                    │  App Opens  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Session   │
                    │   exists?   │
                    └──┬──────┬───┘
                   yes │      │ no
                       │      │
                ┌──────▼──┐ ┌─▼──────────┐
                │ Expired? │ │Login Screen│
                └──┬────┬──┘ └────────────┘
               yes │    │ no
                   │    │
          ┌────────▼┐ ┌─▼──────┐
          │  Login  │ │  App   │
          │  Screen │ │  Home  │
          └─────────┘ └────────┘
```

## Out of Scope (for this spec)
- SMS/OTP verification
- Password-based auth
- User-to-household association (separate spec)
- Firebase Auth integration (using custom Firestore-based auth for simplicity)
- Account deletion
- Phone number change
