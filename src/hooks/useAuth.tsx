/**
 * Authentication hook and provider.
 *
 * Wraps session management (localStorage) and user CRUD (Firestore)
 * behind a single React context so every component can access the
 * current user without prop-drilling.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@/types/user";
import {
  getSession,
  saveSession,
  clearSession,
  updateSessionName,
} from "@/lib/session";
import {
  getUserById,
  getUserByPhone,
  createUser,
  updateUserName,
} from "@/lib/firestore-users";

// ---------------------------------------------------------------------------
// CONTEXT TYPE
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<void>;
  register: (phoneNumber: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// PROVIDER
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ---- bootstrap: check for an existing session on mount ----
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = getSession();

      if (!session) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const existing = await getUserById(session.userId);

        if (cancelled) return;

        if (existing) {
          setUser(existing);
        } else {
          // User doc was deleted — clear the stale session
          clearSession();
        }
      } catch {
        // Network error during bootstrap — clear session to be safe
        if (!cancelled) clearSession();
      }

      if (!cancelled) setIsLoading(false);
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- login ----
  const login = useCallback(async (phoneNumber: string) => {
    const found = await getUserByPhone(phoneNumber);
    if (!found) {
      throw new Error("No account found for this phone number");
    }
    saveSession(found.id, found.phoneNumber, found.displayName);
    setUser(found);
  }, []);

  // ---- register ----
  const register = useCallback(
    async (phoneNumber: string, displayName: string) => {
      // createUser throws if phone is already taken — let it propagate
      const newUser = await createUser(phoneNumber, displayName);
      saveSession(newUser.id, newUser.phoneNumber, newUser.displayName);
      setUser(newUser);
    },
    [],
  );

  // ---- logout ----
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // ---- updateName ----
  const updateName = useCallback(
    async (displayName: string) => {
      if (!user) {
        throw new Error("Cannot update name: not authenticated");
      }
      await updateUserName(user.id, displayName);
      updateSessionName(displayName);
      setUser((prev) =>
        prev ? { ...prev, displayName, updatedAt: new Date() } : null,
      );
    },
    [user],
  );

  // ---- context value ----
  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
    updateName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
