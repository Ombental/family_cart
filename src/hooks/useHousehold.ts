/**
 * Household context hook.
 *
 * Replaces the old thin wrapper (userId === householdId) with a real
 * lookup against /users/{userId}/groupMemberships/{groupId}.
 *
 * Returns the user's householdId, householdName, and householdColor
 * for the given group, with real-time updates via onSnapshot.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserMembership } from "@/lib/firestore-groups";
import { subscribeToHouseholds } from "@/lib/firestore-groups";
import type { GroupMembership, Household } from "@/types/group";

export interface HouseholdContext {
  householdId: string;
  householdName: string;
  householdColor: string;
  loading: boolean;
}

/**
 * Get the current user's household context for a given group.
 *
 * Subscribes to the membership doc and resolves the household color
 * from the households subcollection.
 */
export function useHouseholdContext(
  groupId: string | undefined
): HouseholdContext & { membership: GroupMembership | null } {
  const { user } = useAuth();
  const [membership, setMembership] = useState<GroupMembership | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !groupId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing params
      return;
    }

    let membershipLoaded = false;
    let householdsLoaded = false;

    const maybeFinish = () => {
      if (membershipLoaded && householdsLoaded) setLoading(false);
    };

    const unsubMembership = subscribeToUserMembership(
      user.id,
      groupId,
      (m) => {
        setMembership(m);
        membershipLoaded = true;
        maybeFinish();
      }
    );

    const unsubHouseholds = subscribeToHouseholds(groupId, (h) => {
      setHouseholds(h);
      householdsLoaded = true;
      maybeFinish();
    });

    return () => {
      unsubMembership();
      unsubHouseholds();
    };
  }, [user, groupId]);

  const household = households.find((h) => h.id === membership?.householdId);

  return {
    householdId: membership?.householdId ?? "",
    householdName: membership?.householdName ?? "",
    householdColor: household?.color ?? "",
    loading,
    membership,
  };
}
