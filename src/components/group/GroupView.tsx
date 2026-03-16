import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingCart, Settings, LogOut, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeaveGroupDialog } from "@/components/group/LeaveGroupDialog";
import { ConflictDialog } from "@/components/shopper/ConflictDialog";
import { InviteDisplay } from "@/components/invite/InviteDisplay";
import { SyncBanner } from "@/components/list/SyncBanner";
import { AddItemForm } from "@/components/list/AddItemForm";
import { GroceryList } from "@/components/list/GroceryList";
import { ItemActions } from "@/components/list/ItemActions";
import { regenerateInviteCode, leaveGroup } from "@/lib/firestore-groups";
import { deleteWithUndo } from "@/lib/delete-with-undo";
import { useHouseholdContext } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useItems } from "@/hooks/useItems";
import { useTrip } from "@/hooks/useTrip";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useItemCatalog } from "@/hooks/useItemCatalog";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Group, Household } from "@/types/group";
import type { Item } from "@/types/item";

interface GroupViewProps {
  group: Group;
  households: Household[];
}

/**
 * Active group view -- shown when 2+ households are present.
 * Renders a dashboard summary card with per-household item breakdown,
 * the shared grocery list with filter tabs, and a FAB for adding items.
 *
 * Integrates Shopper Mode (US-07): shows "Start Shopping" / "Continue Shopping"
 * button, or an info banner when another household is shopping.
 */
export function GroupView({ group, households }: GroupViewProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { householdId, householdName } = useHouseholdContext(group.id);
  const { isOnline } = useOnlineStatus();
  const {
    items,
    loading: itemsLoading,
    addItem,
    updateItem,
    softDeleteItem,
    undoDeleteItem,
    toggleItemStatus,
  } = useItems(group.id, householdId);
  const {
    activeTrip,
    loading: tripLoading,
    startTrip,
    isShopperMode,
    isCurrentHouseholdShopping,
  } = useTrip(group.id, householdId, householdName);

  const { suggestions } = useItemCatalog(group.id, items);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictHouseholdName, setConflictHouseholdName] = useState("");
  const [startingTrip, setStartingTrip] = useState(false);

  // Per-household item counts for the summary card
  const householdCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.householdId, (counts.get(item.householdId) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const handleRegenerate = useCallback(async () => {
    await regenerateInviteCode(group.id);
  }, [group.id]);

  const handleLeaveGroup = useCallback(async () => {
    await leaveGroup({ groupId: group.id, userId: user!.id, householdId });
    navigate("/", { replace: true });
  }, [group.id, user, householdId, navigate]);

  const handleStartShopping = useCallback(async () => {
    // If current household already has an active trip, go straight to shopper mode
    if (isCurrentHouseholdShopping) {
      navigate(`/group/${group.id}/shopper`);
      return;
    }

    setStartingTrip(true);
    try {
      const result = await startTrip();

      if (result.conflict) {
        setConflictHouseholdName(result.activeTrip.startedByHouseholdName);
        setConflictDialogOpen(true);
      } else {
        navigate(`/group/${group.id}/shopper`);
      }
    } catch (err) {
      console.error("Failed to start trip:", err);
    } finally {
      setStartingTrip(false);
    }
  }, [isCurrentHouseholdShopping, startTrip, navigate, group.id]);

  return (
    <div className="space-y-6">
      {/* Group header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{group.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {households.length !== 1 ? t("common.householdsPlural", { count: households.length }) : t("common.households", { count: households.length })}
          </p>
        </div>

        {/* Settings menu with Leave Group option */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("group.settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setLeaveDialogOpen(true)}
            >
              <LogOut className="h-4 w-4 me-2" />
              {t("group.leaveGroup")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Leave group confirmation dialog */}
      <LeaveGroupDialog
        groupName={group.name}
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onConfirm={handleLeaveGroup}
      />

      {/* Trip conflict dialog */}
      <ConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        shopperHouseholdName={conflictHouseholdName}
      />

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(`/group/${group.id}/members`)}
        >
          <Users className="h-4 w-4" />
          {t("members.title")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(`/group/${group.id}/trips`)}
        >
          <ClipboardList className="h-4 w-4" />
          {t("trips.history")}
        </Button>
      </div>

      {/* Shopper Mode button / status */}
      {!tripLoading && (
        <div className="space-y-2">
          {isShopperMode && !isCurrentHouseholdShopping && (
            <p className="text-sm text-muted-foreground px-1">
              <ShoppingCart className="inline h-4 w-4 me-1 align-text-bottom" />
              {t("group.shoppingInProgress")}{" "}
              <span className="font-medium">
                {activeTrip?.startedByHouseholdName}
              </span>
            </p>
          )}

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleStartShopping}
            disabled={startingTrip}
          >
            {startingTrip ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            {isCurrentHouseholdShopping
              ? t("group.continueShopping")
              : t("group.startShopping")}
          </Button>
        </div>
      )}

      {/* Dashboard summary card */}
      {!itemsLoading && items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">{t("group.currentShoppingList")}</CardTitle>
            <p className="text-[13px] text-[#82827c]">
              {items.length !== 1 ? t("group.totalItemsPlural", { count: items.length }) : t("group.totalItems", { count: items.length })}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Per-household breakdown */}
            {households.map((hh) => {
              const count = householdCounts.get(hh.id) ?? 0;
              if (count === 0) return null;
              return (
                <div key={hh.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hh.color }}
                    />
                    <span className="text-sm">{hh.name}</span>
                  </div>
                  <span className="text-sm text-[#82827c]">
                    {count !== 1 ? t("common.itemsPlural", { count }) : t("common.items", { count })}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Offline banner */}
      <SyncBanner isOnline={isOnline} />

      {/* Shared grocery list (no header -- summary card replaces it) */}
      <Card>
        <CardContent className="pt-4">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GroceryList
              items={items}
              households={households}
              suggestions={suggestions}
              editingItemId={editingItemId}
              onToggleStatus={(item: Item) => toggleItemStatus(item.id)}
              onEditSave={async (item: Item, fields) => {
                await updateItem({ itemId: item.id, ...fields });
                setEditingItemId(null);
              }}
              onEditCancel={() => setEditingItemId(null)}
              editControls={(item: Item) => (
                <ItemActions
                  itemHouseholdId={item.householdId}
                  currentHouseholdId={householdId}
                  onEdit={() => setEditingItemId(item.id)}
                  onDelete={() =>
                    deleteWithUndo({
                      itemName: item.name,
                      softDelete: () => softDeleteItem(item.id),
                      undoDelete: () => undoDeleteItem(item.id),
                      removedLabel: t("items.removed", { name: item.name }),
                      undoLabel: t("items.undo"),
                      undoFailedLabel: t("items.undoFailed"),
                    })
                  }
                />
              )}
            />
          )}
        </CardContent>
      </Card>

      {/* Add item FAB + bottom sheet (renders fixed-positioned) */}
      <AddItemForm onAdd={addItem} disabled={!isOnline} suggestions={suggestions} />

      {/* Invite section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("group.inviteMore")}
        </h3>
        <InviteDisplay
          inviteCode={group.inviteCode}
          groupName={group.name}
          onRegenerate={handleRegenerate}
          showRegenerate
        />
      </div>
    </div>
  );
}
