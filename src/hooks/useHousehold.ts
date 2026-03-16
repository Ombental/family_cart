/**
 * Household identity hook.
 *
 * Identity is persisted in localStorage (UUID + display name).
 * First-time users complete setup on the Home page before this hook is called.
 */

const LS_ID_KEY = "familycart_household_id";
const LS_NAME_KEY = "familycart_household_name";

export interface HouseholdIdentity {
  householdId: string;
  householdName: string;
}

export function getStoredHouseholdIdentity(): HouseholdIdentity | null {
  const id = localStorage.getItem(LS_ID_KEY);
  const name = localStorage.getItem(LS_NAME_KEY);
  if (!id || !name) return null;
  return { householdId: id, householdName: name };
}

export function saveHouseholdIdentity(name: string): HouseholdIdentity {
  const id = crypto.randomUUID();
  localStorage.setItem(LS_ID_KEY, id);
  localStorage.setItem(LS_NAME_KEY, name);
  return { householdId: id, householdName: name };
}

export function useHousehold(): HouseholdIdentity {
  const identity = getStoredHouseholdIdentity();
  if (!identity) {
    throw new Error("No household identity found. Complete setup on Home page.");
  }
  return identity;
}
