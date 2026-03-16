import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { MembersView } from "@/components/group/MembersView";

/**
 * Group Members page — lists all households in the group.
 */
export function GroupMembersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group, households, loading } = useGroup(groupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group || !groupId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <MembersView
      groupId={groupId}
      groupName={group.name}
      households={households}
    />
  );
}
