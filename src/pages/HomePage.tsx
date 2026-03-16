import { FormEvent, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, LogIn, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getStoredHouseholdIdentity,
  saveHouseholdIdentity,
  type HouseholdIdentity,
} from "@/hooks/useHousehold";
import { findGroupByHousehold } from "@/lib/firestore-groups";

/**
 * Home / Landing page.
 * New users enter their household name inline before being shown Create/Join options.
 * Returning users with stored identity go straight to the group membership check.
 */
export function HomePage() {
  const [identity, setIdentity] = useState<HouseholdIdentity | null>(
    getStoredHouseholdIdentity
  );
  const [nameInput, setNameInput] = useState("");
  const navigate = useNavigate();
  const [checking, setChecking] = useState(!!identity);

  function handleSetupSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setIdentity(saveHouseholdIdentity(trimmed));
    setChecking(true);
  }

  useEffect(() => {
    if (!identity) return;

    let cancelled = false;

    async function check() {
      try {
        const groupId = await findGroupByHousehold(identity!.householdId);
        if (!cancelled && groupId) {
          navigate(`/group/${groupId}`, { replace: true });
          return;
        }
      } catch (err) {
        console.error("Error checking group membership:", err);
      }
      if (!cancelled) setChecking(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [identity, navigate]);

  if (!identity) {
    return (
      <div className="space-y-8">
        <div className="text-center pt-8">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to FamilyCart</h2>
          <p className="mt-2 text-muted-foreground">
            Shared grocery lists for your family.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-center">What's your household name?</h3>
              <p className="text-sm text-muted-foreground text-center">
                This name identifies your household to other group members.
              </p>
              <form onSubmit={handleSetupSubmit} className="flex gap-2">
                <Input
                  placeholder="e.g. Smith Family"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                />
                <Button type="submit" disabled={!nameInput.trim()} size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center pt-8">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to FamilyCart</h2>
        <p className="mt-2 text-muted-foreground">
          Shared grocery lists for your family.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-semibold">Start a new group</h3>
              <p className="text-sm text-muted-foreground">
                Create a family group and invite other households to share a
                grocery list.
              </p>
              <Button asChild className="w-full gap-2">
                <Link to="/create">
                  <Plus className="h-4 w-4" />
                  Create Group
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-semibold">Join an existing group</h3>
              <p className="text-sm text-muted-foreground">
                Have an invite code? Enter it to join a family group.
              </p>
              <Button asChild variant="outline" className="w-full gap-2">
                <Link to="/join">
                  <LogIn className="h-4 w-4" />
                  Join Group
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
