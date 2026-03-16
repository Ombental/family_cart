import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { findGroupByHousehold } from "@/lib/firestore-groups";

/**
 * Home / Landing page.
 *
 * The user is guaranteed to be authenticated (behind RequireAuth).
 * On mount, checks if the user already belongs to a group and redirects if so.
 * Otherwise shows Create/Join options.
 */
export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function check() {
      try {
        const groupId = await findGroupByHousehold(user!.id);
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
  }, [user, navigate]);

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
