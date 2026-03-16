/**
 * Hook to subscribe to a group's completed trips in real-time.
 *
 * Provides:
 * - trips: completed Trip documents (most recent first), each including purchasedItems
 * - loading: true while the initial snapshot loads
 */

import { useState, useEffect } from "react";
import { subscribeToCompletedTrips } from "@/lib/firestore-trips";
import type { Trip } from "@/types/trip";

export interface UseTripHistoryResult {
  trips: Trip[];
  loading: boolean;
}

export function useTripHistory(
  groupId: string | undefined
): UseTripHistoryResult {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToCompletedTrips(groupId, (updatedTrips) => {
      setTrips(updatedTrips);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [groupId]);

  return { trips, loading };
}
