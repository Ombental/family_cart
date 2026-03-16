/**
 * Hook to subscribe to a group's active trip in real-time.
 *
 * Provides:
 * - activeTrip: the currently active Trip document (or null)
 * - loading: true while the initial snapshot loads
 * - startTrip: start a new shopping trip (with conflict detection)
 * - completeTrip: mark the active trip as complete
 * - isShopperMode: convenience boolean (activeTrip !== null)
 * - isCurrentHouseholdShopping: convenience boolean (current household started the trip)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  subscribeToActiveTrip,
  createTrip as firestoreCreateTrip,
  completeTrip as firestoreCompleteTrip,
  type CreateTripResult,
} from "@/lib/firestore-trips";
import type { Trip } from "@/types/trip";

export interface UseTripResult {
  activeTrip: Trip | null;
  loading: boolean;
  startTrip: () => Promise<CreateTripResult>;
  completeTrip: (metadata: { storeName: string; totalAmount: number; completedByUserId: string }) => Promise<void>;
  isShopperMode: boolean;
  isCurrentHouseholdShopping: boolean;
}

export function useTrip(
  groupId: string | undefined,
  householdId: string,
  householdName: string,
  userName?: string
): UseTripResult {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing groupId
      return;
    }

    const unsub = subscribeToActiveTrip(groupId, (trip) => {
      setActiveTrip(trip);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [groupId]);

  const startTrip = useCallback(async (): Promise<CreateTripResult> => {
    if (!groupId) throw new Error("No group selected.");
    return firestoreCreateTrip({
      groupId,
      startedByHouseholdId: householdId,
      startedByHouseholdName: householdName,
      startedByUserName: userName,
    });
  }, [groupId, householdId, householdName, userName]);

  const completeTrip = useCallback(async (metadata: { storeName: string; totalAmount: number; completedByUserId: string }): Promise<void> => {
    if (!groupId) throw new Error("No group selected.");
    if (!activeTrip) throw new Error("No active trip to complete.");
    return firestoreCompleteTrip({
      groupId,
      tripId: activeTrip.id,
      ...metadata,
    });
  }, [groupId, activeTrip]);

  const isShopperMode = activeTrip !== null;

  const isCurrentHouseholdShopping = useMemo(
    () => activeTrip?.startedByHouseholdId === householdId,
    [activeTrip, householdId]
  );

  return {
    activeTrip,
    loading,
    startTrip,
    completeTrip,
    isShopperMode,
    isCurrentHouseholdShopping,
  };
}
