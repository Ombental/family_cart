/**
 * Hook to subscribe to a group and its households in real-time.
 *
 * Provides:
 * - group: the Group document
 * - households: the list of Household documents
 * - status: "holding" (1 household) or "active" (2+)
 * - loading: true while initial data loads
 */

import { useState, useEffect } from "react";
import {
  subscribeToGroup,
  subscribeToHouseholds,
} from "@/lib/firestore-groups";
import type { Group, Household, GroupStatus } from "@/types/group";

export interface UseGroupResult {
  group: Group | null;
  households: Household[];
  status: GroupStatus;
  loading: boolean;
}

export function useGroup(groupId: string | undefined): UseGroupResult {
  const [group, setGroup] = useState<Group | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let groupLoaded = false;
    let householdsLoaded = false;

    const maybeFinishLoading = () => {
      if (groupLoaded && householdsLoaded) {
        setLoading(false);
      }
    };

    const unsubGroup = subscribeToGroup(groupId, (g) => {
      setGroup(g);
      groupLoaded = true;
      maybeFinishLoading();
    });

    const unsubHouseholds = subscribeToHouseholds(groupId, (h) => {
      setHouseholds(h);
      householdsLoaded = true;
      maybeFinishLoading();
    });

    return () => {
      unsubGroup();
      unsubHouseholds();
    };
  }, [groupId]);

  const status: GroupStatus = households.length >= 2 ? "active" : "holding";

  return { group, households, status, loading };
}
