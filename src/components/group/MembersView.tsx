import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Loader2,
  AlertCircle,
  LogOut,
  Plus,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LeaveGroupDialog } from "@/components/group/LeaveGroupDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useHouseholdContext } from "@/hooks/useHousehold";
import {
  switchHousehold,
  renameHousehold,
  deleteHousehold,
  leaveGroup,
} from "@/lib/firestore-groups";
import { getUserById } from "@/lib/firestore-users";
import type { Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MembersViewProps {
  groupId: string;
  groupName: string;
  households: Household[];
}

/** Resolved display names keyed by userId. */
type UserNameMap = Record<string, string>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch display names for every unique userId across all households.
 * Returns a map of userId -> displayName.
 */
async function fetchAllMemberNames(
  households: Household[]
): Promise<UserNameMap> {
  const uniqueIds = Array.from(
    new Set(households.flatMap((h) => h.memberUserIds))
  );
  const results = await Promise.all(uniqueIds.map(getUserById));
  const map: UserNameMap = {};
  for (let i = 0; i < uniqueIds.length; i++) {
    map[uniqueIds[i]] = results[i]?.displayName ?? "Unknown";
  }
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full household management view.
 *
 * - Lists all households with member names
 * - Highlights the current user's household
 * - Rename / Switch / Delete actions on the current household
 * - Leave Group button at the bottom
 */
export function MembersView({
  groupId,
  groupName,
  households,
}: MembersViewProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { householdId } = useHouseholdContext(groupId);

  // ---- Member name resolution ----
  const [nameMap, setNameMap] = useState<UserNameMap>({});
  const [namesLoading, setNamesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setNamesLoading(true);
    fetchAllMemberNames(households).then((map) => {
      if (!cancelled) {
        setNameMap(map);
        setNamesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [households]);

  // ---- Rename state ----
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback(
    (hh: Household) => {
      setRenamingId(hh.id);
      setRenameValue(hh.name);
      setRenameError("");
      // Focus after next render
      setTimeout(() => renameInputRef.current?.focus(), 0);
    },
    []
  );

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
    setRenameError("");
  }, []);

  const confirmRename = useCallback(async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError(t("members.nameEmpty"));
      return;
    }
    if (trimmed.length > 50) {
      setRenameError(t("members.nameTooLong"));
      return;
    }
    setRenameSaving(true);
    try {
      await renameHousehold({ groupId, householdId: renamingId, newName: trimmed });
      cancelRename();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("members.renameFailed");
      setRenameError(msg);
    } finally {
      setRenameSaving(false);
    }
  }, [renamingId, renameValue, groupId, cancelRename]);

  // ---- Switch dialog state ----
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<string | null>(null);
  const [switchNewName, setSwitchNewName] = useState("");
  const [switchCreatingNew, setSwitchCreatingNew] = useState(false);
  const [switchSaving, setSwitchSaving] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const openSwitchDialog = useCallback(() => {
    setSwitchDialogOpen(true);
    setSwitchTarget(null);
    setSwitchNewName("");
    setSwitchCreatingNew(false);
    setSwitchError("");
  }, []);

  const confirmSwitch = useCallback(async () => {
    if (!user) return;
    if (switchCreatingNew) {
      const trimmed = switchNewName.trim();
      if (!trimmed) {
        setSwitchError(t("members.nameEmpty"));
        return;
      }
      if (trimmed.length > 50) {
        setSwitchError(t("members.nameTooLong"));
        return;
      }
    } else if (!switchTarget) {
      setSwitchError(t("members.selectHousehold"));
      return;
    }

    setSwitchSaving(true);
    try {
      await switchHousehold({
        groupId,
        userId: user.id,
        oldHouseholdId: householdId,
        ...(switchCreatingNew
          ? { newHouseholdName: switchNewName.trim() }
          : { newHouseholdId: switchTarget! }),
      });
      setSwitchDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("members.switchFailed");
      setSwitchError(msg);
    } finally {
      setSwitchSaving(false);
    }
  }, [user, groupId, householdId, switchCreatingNew, switchNewName, switchTarget]);

  // ---- Delete dialog state ----
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const openDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true);
    setDeleteError("");
  }, []);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteHousehold({ groupId, householdId });
      setDeleteDialogOpen(false);
      navigate(`/group/${groupId}`, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("members.deleteFailed");
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }, [groupId, householdId, navigate]);

  // ---- Leave group state ----
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const handleLeaveGroup = useCallback(async () => {
    if (!user) return;
    await leaveGroup({ groupId, userId: user.id, householdId });
    navigate("/", { replace: true });
  }, [groupId, user, householdId, navigate]);

  // ---- Derived ----
  const otherHouseholds = households.filter((h) => h.id !== householdId);

  // ---- Render helpers ----

  const renderMemberList = (hh: Household) => {
    if (namesLoading) {
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("members.loadingMembers")}</span>
        </div>
      );
    }

    if (hh.memberUserIds.length === 0) {
      return (
        <p className="text-xs text-muted-foreground mt-1">{t("members.noMembers")}</p>
      );
    }

    return (
      <ul className="mt-1 space-y-0.5">
        {hh.memberUserIds.map((uid) => {
          const name = nameMap[uid] ?? "Unknown";
          const isCurrentUser = uid === user?.id;
          return (
            <li key={uid} className="text-sm text-muted-foreground">
              {name}
              {isCurrentUser && (
                <span className="ms-1 text-xs font-medium text-primary">
                  {t("members.you")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderHouseholdCard = (hh: Household) => {
    const isMine = hh.id === householdId;
    const isRenaming = renamingId === hh.id;

    return (
      <Card
        key={hh.id}
        className={
          isMine
            ? "border-primary shadow-sm"
            : "border-border"
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: color dot + name + members */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="h-8 w-8 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: hh.color }}
              />
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => {
                        setRenameValue(e.target.value);
                        setRenameError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      disabled={renameSaving}
                      className="h-8 text-sm"
                      maxLength={50}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={confirmRename}
                      disabled={renameSaving}
                    >
                      {renameSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={cancelRename}
                      disabled={renameSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium truncate">{hh.name}</p>
                    {isMine && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-semibold shrink-0">
                        {t("members.yourHousehold")}
                      </span>
                    )}
                  </div>
                )}

                {renameError && isRenaming && (
                  <p className="text-xs text-destructive mt-1">{renameError}</p>
                )}

                <p className="text-xs text-muted-foreground mt-0.5">
                  <Users className="inline h-3 w-3 me-1 align-text-bottom" />
                  {hh.memberUserIds.length !== 1 ? t("common.membersPlural", { count: hh.memberUserIds.length }) : t("common.members", { count: hh.memberUserIds.length })}
                </p>

                {renderMemberList(hh)}
              </div>
            </div>

            {/* Right: actions (only for current user's household) */}
            {isMine && !isRenaming && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => startRename(hh)}
                  title={t("members.renameHousehold")}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openSwitchDialog}
                  title={t("members.switchHousehold")}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={openDeleteDialog}
                  title={t("members.deleteHousehold")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ---- Main render ----

  // Sort: current user's household first
  const sortedHouseholds = [...households].sort((a, b) => {
    if (a.id === householdId) return -1;
    if (b.id === householdId) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/group/${groupId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("members.title")}</h2>
          <p className="text-sm text-muted-foreground">{groupName}</p>
        </div>
      </div>

      {/* Household count */}
      <p className="text-sm text-muted-foreground">
        {households.length !== 1 ? t("common.householdsPlural", { count: households.length }) : t("common.households", { count: households.length })}
      </p>

      {/* Household cards */}
      <div className="space-y-3">
        {sortedHouseholds.map(renderHouseholdCard)}

        {households.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("members.noHouseholds")}
          </p>
        )}
      </div>

      {/* Switch Household Dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("members.switchTitle")}</DialogTitle>
            <DialogDescription>
              {t("members.switchDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {otherHouseholds.map((hh) => (
              <button
                key={hh.id}
                type="button"
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-start transition-colors ${
                  switchTarget === hh.id && !switchCreatingNew
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  setSwitchTarget(hh.id);
                  setSwitchCreatingNew(false);
                  setSwitchError("");
                }}
              >
                <div
                  className="h-6 w-6 rounded-full shrink-0"
                  style={{ backgroundColor: hh.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{hh.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hh.memberUserIds.length !== 1 ? t("common.membersPlural", { count: hh.memberUserIds.length }) : t("common.members", { count: hh.memberUserIds.length })}
                  </p>
                </div>
              </button>
            ))}

            {/* Create new household option */}
            <button
              type="button"
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-start transition-colors ${
                switchCreatingNew
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => {
                setSwitchCreatingNew(true);
                setSwitchTarget(null);
                setSwitchError("");
              }}
            >
              <div className="h-6 w-6 rounded-full shrink-0 bg-muted flex items-center justify-center">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("members.createNewHousehold")}</p>
            </button>

            {switchCreatingNew && (
              <Input
                placeholder={t("members.newHouseholdPlaceholder")}
                value={switchNewName}
                onChange={(e) => {
                  setSwitchNewName(e.target.value);
                  setSwitchError("");
                }}
                maxLength={50}
                autoFocus
              />
            )}

            {switchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{switchError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSwitchDialogOpen(false)}
              disabled={switchSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmSwitch} disabled={switchSaving}>
              {switchSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t("members.switching")}
                </>
              ) : (
                t("members.switch")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Household Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("members.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("members.deleteDesc")}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t("members.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 me-2" />
                  {t("members.deleteButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Group */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive gap-2"
          onClick={() => setLeaveDialogOpen(true)}
        >
          <LogOut className="h-4 w-4" />
          {t("group.leaveGroup")}
        </Button>
      </div>

      <LeaveGroupDialog
        groupName={groupName}
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onConfirm={handleLeaveGroup}
      />
    </div>
  );
}
