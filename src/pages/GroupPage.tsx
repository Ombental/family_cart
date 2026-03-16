import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGroup } from "@/hooks/useGroup";
import { HoldingState } from "@/components/group/HoldingState";
import { GroupView } from "@/components/group/GroupView";

/**
 * Group page — shows holding state or active group view
 * based on the number of households.
 *
 * Auto-transitions from holding to active via onSnapshot when
 * a 2nd household joins.
 */
export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group, households, status, loading } = useGroup(groupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  if (status === "holding") {
    return <HoldingState group={group} />;
  }

  return <GroupView group={group} households={households} />;
}
