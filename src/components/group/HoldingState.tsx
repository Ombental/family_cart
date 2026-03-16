import { useCallback } from "react";
import { Clock, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteDisplay } from "@/components/invite/InviteDisplay";
import { regenerateInviteCode } from "@/lib/firestore-groups";
import type { Group } from "@/types/group";

interface HoldingStateProps {
  group: Group;
  onInviteRegenerated?: (newCode: string) => void;
}

/**
 * Holding state screen shown when a group has only 1 household.
 * The grocery list is locked until a 2nd household joins.
 */
export function HoldingState({ group, onInviteRegenerated }: HoldingStateProps) {
  const handleRegenerate = useCallback(async () => {
    const newCode = await regenerateInviteCode(group.id);
    onInviteRegenerated?.(newCode);
  }, [group.id, onInviteRegenerated]);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Clock className="h-5 w-5" />
            Waiting for another household to join...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-700 dark:text-amber-300">
          <p>
            Share the invite code below with another household. Once they join,
            your shared grocery list will activate automatically.
          </p>
        </CardContent>
      </Card>

      {/* Invite CTA */}
      <InviteDisplay
        inviteCode={group.inviteCode}
        groupName={group.name}
        onRegenerate={handleRegenerate}
        showRegenerate
      />

      {/* Locked list indicator */}
      <Card className="opacity-60">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Lock className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">Grocery list is locked</p>
          <p className="text-xs mt-1">
            It will unlock when a second household joins.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
