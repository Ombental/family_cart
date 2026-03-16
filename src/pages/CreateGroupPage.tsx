import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateGroupForm } from "@/components/group/CreateGroupForm";
import { useHousehold } from "@/hooks/useHousehold";
import { createGroup, cacheGroupMembership } from "@/lib/firestore-groups";

/**
 * Create Group page. Renders the group creation form and navigates
 * to the group view on success.
 */
export function CreateGroupPage() {
  const { householdId, householdName } = useHousehold();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (groupName: string) => {
      setLoading(true);
      setError(null);
      try {
        const { groupId } = await createGroup({
          groupName,
          householdId,
          householdName,
        });
        cacheGroupMembership(householdId, groupId);
        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        console.error("Failed to create group:", err);
        setError("Failed to create group. Please check your connection and try again.");
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CreateGroupForm onCreateGroup={handleCreate} loading={loading} />
    </div>
  );
}
