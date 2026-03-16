import { useState, useCallback, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createGroup } from "@/lib/firestore-groups";

/**
 * Create Group page — 2-step flow.
 *
 * Step 1: Enter group name
 * Step 2: Enter household name
 * On submit: creates group + household + membership in one batch.
 */
export function CreateGroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStep1 = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!groupName.trim()) return;
      setStep(2);
    },
    [groupName]
  );

  const handleStep2 = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user || !householdName.trim()) return;
      setLoading(true);
      try {
        const { groupId } = await createGroup({
          groupName: groupName.trim(),
          householdName: householdName.trim(),
          userId: user.id,
        });
        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        console.error("Failed to create group:", err);
        setLoading(false);
      }
    },
    [user, groupName, householdName, navigate]
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/" onClick={(e) => { if (step === 2) { e.preventDefault(); setStep(1); } }}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create a Family Group</CardTitle>
            <CardDescription>
              Start a new shared grocery list. You can invite other households after
              creating the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. The Bental-Smith Family"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!groupName.trim()}>
                Next
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Name Your Household</CardTitle>
            <CardDescription>
              What should your household be called in "{groupName.trim()}"?
              Other members will see this name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  placeholder="e.g. The Smiths"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  maxLength={50}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading || !householdName.trim()}
              >
                <Plus className="h-4 w-4" />
                {loading ? "Creating..." : "Create Group"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
