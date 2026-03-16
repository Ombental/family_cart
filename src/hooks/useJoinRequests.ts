/**
 * Hook to manage join requests for an active shopping trip.
 *
 * Used by active shoppers to see pending requests and approve/reject them,
 * and by group members to request to join.
 */

import { useState, useEffect, useCallback } from "react";
import {
  subscribeToPendingRequests,
  requestToJoin as firestoreRequestToJoin,
  approveJoinRequest as firestoreApprove,
  rejectJoinRequest as firestoreReject,
  type RequestToJoinParams,
} from "@/lib/firestore-join-requests";
import type { JoinRequest } from "@/types/join-request";

export interface UseJoinRequestsResult {
  pendingRequests: JoinRequest[];
  pendingCount: number;
  requestToJoin: (params: Omit<RequestToJoinParams, "groupId" | "tripId">) => Promise<string>;
  approve: (requestId: string, request: JoinRequest) => Promise<void>;
  reject: (requestId: string) => Promise<void>;
}

export function useJoinRequests(
  groupId: string | undefined,
  tripId: string | undefined
): UseJoinRequestsResult {
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!groupId || !tripId) {
      setPendingRequests([]); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing params
      return;
    }

    return subscribeToPendingRequests(groupId, tripId, setPendingRequests);
  }, [groupId, tripId]);

  const requestToJoin = useCallback(
    async (params: Omit<RequestToJoinParams, "groupId" | "tripId">) => {
      if (!groupId || !tripId) throw new Error("No active trip.");
      return firestoreRequestToJoin({ groupId, tripId, ...params });
    },
    [groupId, tripId]
  );

  const approve = useCallback(
    async (requestId: string, request: JoinRequest) => {
      if (!groupId || !tripId) throw new Error("No active trip.");
      return firestoreApprove(groupId, tripId, requestId, request);
    },
    [groupId, tripId]
  );

  const reject = useCallback(
    async (requestId: string) => {
      if (!groupId || !tripId) throw new Error("No active trip.");
      return firestoreReject(groupId, tripId, requestId);
    },
    [groupId, tripId]
  );

  return {
    pendingRequests,
    pendingCount: pendingRequests.length,
    requestToJoin,
    approve,
    reject,
  };
}
