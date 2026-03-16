import { useState, useCallback, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { createGroup } from "@/lib/firestore-groups";
import { useLanguage } from "@/i18n/LanguageContext";

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
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      try {
        const { groupId } = await createGroup({
          groupName: groupName.trim(),
          householdName: householdName.trim(),
          userId: user.id,
        });
        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        console.error("Failed to create group:", err);
        setError(t("group.createFailed"));
        setLoading(false);
      }
    },
    [user, groupName, householdName, navigate, t]
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/" onClick={(e) => { if (step === 2) { e.preventDefault(); setStep(1); } }}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("group.createTitle")}</CardTitle>
            <CardDescription>
              {t("group.createDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">{t("group.groupName")}</Label>
                <Input
                  id="group-name"
                  placeholder={t("group.groupNamePlaceholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!groupName.trim()}>
                {t("group.next")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("group.nameHousehold")}</CardTitle>
            <CardDescription>
              {t("group.nameHouseholdDesc", { groupName: groupName.trim() })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">{t("group.householdName")}</Label>
                <Input
                  id="household-name"
                  placeholder={t("group.householdNamePlaceholder")}
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
                {loading ? t("group.creating") : t("group.createGroupButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
