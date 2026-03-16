import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JoinForm } from "@/components/invite/JoinForm";
import { useHousehold } from "@/hooks/useHousehold";
import { joinGroup, JoinError, cacheGroupMembership } from "@/lib/firestore-groups";

/**
 * Join Group page. Renders the invite code form and navigates
 * to the group view on successful join.
 */
export function JoinGroupPage() {
  const { householdId, householdName } = useHousehold();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(
    async (inviteCode: string) => {
      setLoading(true);
      setError(null);
      try {
        const { groupId } = await joinGroup({
          inviteCode,
          householdId,
          householdName,
        });
        cacheGroupMembership(householdId, groupId);
        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        if (err instanceof JoinError) {
          setError(err.message);
        } else {
          setError("Something went wrong. Please try again.");
          console.error("Join failed:", err);
        }
        setLoading(false);
      }
    },
    [householdId, householdName, navigate]
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <JoinForm onJoin={handleJoin} error={error} loading={loading} />
    </div>
  );
}
