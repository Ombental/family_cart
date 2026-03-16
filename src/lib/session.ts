/**
 * Session manager.
 *
 * Persists a lightweight session object in localStorage with a 7-day TTL.
 * No external dependencies — pure read/write against the Storage API.
 */

const SESSION_KEY = "familycart_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface Session {
  userId: string;
  phoneNumber: string;
  displayName: string;
  loginAt: number; // Date.now()
}

/** Persist a new session to localStorage. */
export function saveSession(
  userId: string,
  phoneNumber: string,
  displayName: string,
): void {
  const session: Session = {
    userId,
    phoneNumber,
    displayName,
    loginAt: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Read the current session. Returns null if missing or expired. */
export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session: Session = JSON.parse(raw);
    if (session.loginAt + SESSION_TTL_MS < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/** Remove the session from localStorage. */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Returns true when a valid (non-expired) session exists. */
export function isSessionValid(): boolean {
  return getSession() !== null;
}

/** Update only the displayName field, preserving the original loginAt. */
export function updateSessionName(displayName: string): void {
  const session = getSession();
  if (!session) return;
  session.displayName = displayName;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
