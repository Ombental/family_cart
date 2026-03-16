/**
 * Household identity hook.
 *
 * Reads identity from the authenticated user via useAuth().
 * The user's `id` becomes the `householdId`, and `displayName` becomes `householdName`.
 *
 * This is a thin wrapper that preserves backward compatibility -- all existing
 * components that call `useHousehold()` continue to work without individual changes.
 */

import { useAuth } from "@/hooks/useAuth";
import { getSession } from "@/lib/session";

export interface HouseholdIdentity {
  householdId: string;
  householdName: string;
}

/**
 * @deprecated Use `useAuth()` directly instead.
 *
 * Returns the household identity from the current auth session (localStorage).
 * Falls back to null if no session exists.
 */
export function getStoredHouseholdIdentity(): HouseholdIdentity | null {
  const session = getSession();
  if (!session) return null;
  return {
    householdId: session.userId,
    householdName: session.displayName,
  };
}

/**
 * @deprecated Identity is now managed by the auth system (register/login).
 * This function is a no-op that returns the current session identity.
 * It no longer writes to localStorage or generates UUIDs.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function saveHouseholdIdentity(_name: string): HouseholdIdentity {
  const session = getSession();
  if (!session) {
    throw new Error(
      "saveHouseholdIdentity is deprecated. Use auth register/login instead.",
    );
  }
  return {
    householdId: session.userId,
    householdName: session.displayName,
  };
}

/**
 * Hook that returns the current household identity derived from the
 * authenticated user. Must be called within an AuthProvider.
 *
 * The user's `id` maps to `householdId` and `displayName` maps to `householdName`.
 */
export function useHousehold(): HouseholdIdentity {
  const { user } = useAuth();
  if (!user) {
    throw new Error("useHousehold requires an authenticated user");
  }
  return {
    householdId: user.id,
    householdName: user.displayName,
  };
}
