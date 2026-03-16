import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  validateInviteCode,
  joinGroup,
  JoinError,
} from "@/lib/firestore-groups";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Error message keys mapped from JoinError codes
// ---------------------------------------------------------------------------
const ERROR_MESSAGE_KEYS: Record<string, string> = {
  invalid_code: "join.errorInvalidCode",
  expired: "join.errorExpired",
  already_member: "join.errorAlreadyMember",
  household_name_taken: "join.errorHouseholdNameTaken",
  household_limit: "join.errorHouseholdLimit",
};

function friendlyError(err: unknown, t: (key: string) => string): string {
  if (err instanceof JoinError) {
    const key = ERROR_MESSAGE_KEYS[err.code];
    return key ? t(key) : err.message;
  }
  return t("join.errorGeneric");
}

// ---------------------------------------------------------------------------
// Inline error banner
// ---------------------------------------------------------------------------
function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Invite code entry
// ---------------------------------------------------------------------------
function StepInviteCode({
  onValidated,
}: {
  onValidated: (data: {
    code: string;
    groupId: string;
    groupName: string;
    households: Household[];
  }) => void;
}) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) {
        setError(t("join.inviteCodeLength"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await validateInviteCode(trimmed);
        onValidated({
          code: trimmed,
          groupId: result.groupId,
          groupName: result.groupName,
          households: result.households,
        });
      } catch (err) {
        setError(friendlyError(err, t));
        setLoading(false);
      }
    },
    [code, onValidated, t]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("join.title")}</CardTitle>
        <CardDescription>
          {t("join.desc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">{t("join.inviteCode")}</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              className="font-mono text-center text-lg tracking-[0.3em] uppercase"
              disabled={loading}
            />
          </div>

          <InlineError message={error} />

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.trim().length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("join.validating")}
              </>
            ) : (
              t("join.validate")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Household picker / creator
// ---------------------------------------------------------------------------
function StepHouseholdPicker({
  groupName,
  households,
  inviteCode,
  onBack,
}: {
  groupName: string;
  households: Household[];
  inviteCode: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doJoin = useCallback(
    async (opts: { existingHouseholdId?: string; newHouseholdName?: string }) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const { groupId } = await joinGroup({
          inviteCode,
          userId: user.id,
          ...opts,
        });
        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        setError(friendlyError(err, t));
        setLoading(false);
      }
    },
    [user, inviteCode, navigate, t]
  );

  const handleJoinExisting = useCallback(
    (householdId: string) => {
      doJoin({ existingHouseholdId: householdId });
    },
    [doJoin]
  );

  const handleCreateNew = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newName.trim();
      if (!trimmed) return;
      doJoin({ newHouseholdName: trimmed });
    },
    [newName, doJoin]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onBack}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{t("join.joiningGroup", { groupName })}</CardTitle>
            <CardDescription>
              {t("join.pickHousehold")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <InlineError message={error} />

        {/* Existing households */}
        {households.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              {t("join.existingHouseholds")}
            </Label>
            {households.map((hh) => (
              <button
                key={hh.id}
                type="button"
                disabled={loading}
                onClick={() => handleJoinExisting(hh.id)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: hh.color }}
                />
                <span className="flex-1 font-medium">{hh.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {hh.memberUserIds.length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        {households.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("common.or")}</span>
            </div>
          </div>
        )}

        {/* Create new household */}
        <form onSubmit={handleCreateNew} className="space-y-2">
          <Label htmlFor="new-household-name">{t("join.createNewHousehold")}</Label>
          <div className="flex gap-2">
            <Input
              id="new-household-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("join.newHouseholdPlaceholder")}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !newName.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.create")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function JoinGroupPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState<
    | { phase: "code" }
    | {
        phase: "household";
        code: string;
        groupId: string;
        groupName: string;
        households: Household[];
      }
  >({ phase: "code" });

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
      </Button>

      {step.phase === "code" ? (
        <StepInviteCode
          onValidated={(data) =>
            setStep({
              phase: "household",
              code: data.code,
              groupId: data.groupId,
              groupName: data.groupName,
              households: data.households,
            })
          }
        />
      ) : (
        <StepHouseholdPicker
          groupName={step.groupName}
          households={step.households}
          inviteCode={step.code}
          onBack={() => setStep({ phase: "code" })}
        />
      )}
    </div>
  );
}
