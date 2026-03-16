import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, LogIn, Loader2, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToUserGroups } from "@/lib/firestore-groups";
import { useLanguage } from "@/i18n/LanguageContext";
import type { GroupMembership } from "@/types/group";

/**
 * Home page — shows the user's group memberships.
 *
 * Subscribes to /users/{userId}/groupMemberships in real-time.
 * If user has no groups, shows Create/Join options.
 * If user has groups, shows a list of group cards + Create/Join.
 */
export function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserGroups(user.id, (ms) => {
      setMemberships(ms);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center pt-8">
        <h2 className="text-3xl font-bold tracking-tight">{t("home.welcome")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("common.tagline")}
        </p>
      </div>

      {/* Group list */}
      {memberships.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("home.yourGroups")}
          </h3>
          {memberships.map((m) => (
            <Link key={m.groupId} to={`/group/${m.groupId}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{m.groupName}</p>
                      <p className="text-sm text-muted-foreground">{m.householdName}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create / Join options */}
      <div className="space-y-4">
        {memberships.length === 0 && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold">{t("home.startNewGroup")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.startNewGroupDesc")}
                  </p>
                  <Button asChild className="w-full gap-2">
                    <Link to="/create">
                      <Plus className="h-4 w-4" />
                      {t("home.createGroup")}
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
                <span className="bg-background px-2 text-muted-foreground">{t("common.or")}</span>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold">{t("home.joinExistingGroup")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.joinExistingGroupDesc")}
                  </p>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link to="/join">
                      <LogIn className="h-4 w-4" />
                      {t("home.joinGroup")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {memberships.length > 0 && (
          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link to="/create">
                <Plus className="h-4 w-4" />
                {t("home.newGroup")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link to="/join">
                <LogIn className="h-4 w-4" />
                {t("home.joinGroup")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
