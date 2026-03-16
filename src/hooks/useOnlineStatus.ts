/**
 * Hook for online/offline detection.
 *
 * Uses navigator.onLine for the initial state and listens to the
 * window online/offline events for real-time updates.
 *
 * Does not poll. Does not build a parallel sync tracker.
 * Firestore's enableIndexedDbPersistence handles offline queuing natively.
 *
 * See DEVELOPER_INSTRUCTIONS Section 6.1.
 */

import { useState, useEffect } from "react";

export interface UseOnlineStatusResult {
  isOnline: boolean;
}

export function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
