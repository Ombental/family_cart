/**
 * Hook that subscribes to the current user's join request status for a trip.
 *
 * Used by group members who have requested to join — provides real-time
 * feedback: pending, approved, rejected, or none.
 */

import { useState, useEffect } from "react";
import { subscribeToMyJoinRequest } from "@/lib/firestore-join-requests";
import type { JoinRequest } from "@/types/join-request";

export type JoinRequestState = "none" | "pending" | "approved" | "rejected";

export interface UseJoinRequestStatusResult {
  status: JoinRequestState;
  request: JoinRequest | null;
}

export function useJoinRequestStatus(
  groupId: string | undefined,
  tripId: string | undefined,
  userId: string | undefined
): UseJoinRequestStatusResult {
  const [request, setRequest] = useState<JoinRequest | null>(null);

  useEffect(() => {
    if (!groupId || !tripId || !userId) {
      setRequest(null); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing params
      return;
    }

    return subscribeToMyJoinRequest(groupId, tripId, userId, setRequest);
  }, [groupId, tripId, userId]);

  const status: JoinRequestState = request?.status ?? "none";

  return { status, request };
}
