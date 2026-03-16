import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/shopper/OfflineBanner";
import { AddItemForm } from "@/components/list/AddItemForm";
import { ShopperGroupCard } from "@/components/shopper/ShopperGroupCard";
import { useTrip } from "@/hooks/useTrip";
import { useItems } from "@/hooks/useItems";
import { useHouseholdContext } from "@/hooks/useHousehold";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useGroup } from "@/hooks/useGroup";
import { useItemCatalog } from "@/hooks/useItemCatalog";
import { useGroupedItems } from "@/hooks/useGroupedItems";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Household } from "@/types/group";

/**
 * Full-page Shopper Mode experience.
 *
 * Rendered at /group/:groupId/shopper. Provides a mobile-first,
 * large-touch-target grocery list optimized for one-handed use
 * while shopping.
 *
 * Blue-themed header with progress bar per wireframe spec.
 *
 * If no active trip exists, redirects back to the group view.
 */
export function ShopperModePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { householdId, householdName } = useHouseholdContext(groupId);
  const { isOnline } = useOnlineStatus();
  const { households } = useGroup(groupId);
  const { activeTrip, loading: tripLoading, completeTrip } = useTrip(
    groupId,
    householdId,
    householdName
  );
  const {
    items,
    loading: itemsLoading,
    addItem,
    toggleItemStatus,
  } = useItems(groupId, householdId);

  const { suggestions } = useItemCatalog(groupId, items);

  const [completing, setCompleting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const householdMap = useMemo(
    () => new Map<string, Household>(households.map((h) => [h.id, h])),
    [households]
  );

  const { pendingGroups, boughtGroups } = useGroupedItems(items, householdMap);

  const handleCompleteTrip = useCallback(async () => {
    setCompleting(true);
    // Save trip ID before completing -- completeTrip does not return it
    const savedTripId = activeTrip?.id;
    try {
      await completeTrip();
      if (savedTripId) {
        navigate(`/group/${groupId}/trip/${savedTripId}`, { replace: true });
      } else {
        navigate(`/group/${groupId}`, { replace: true });
      }
    } catch (err) {
      console.error("Failed to complete trip:", err);
      setCompleting(false);
    }
  }, [completeTrip, navigate, groupId, activeTrip?.id]);

  const handleToggle = useCallback(
    async (itemId: string) => {
      await toggleItemStatus(itemId);
    },
    [toggleItemStatus]
  );

  const handleBack = useCallback(() => {
    navigate(`/group/${groupId}`);
  }, [navigate, groupId]);

  // Loading state
  if (tripLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No active trip -- redirect to group view
  if (!activeTrip) {
    return <Navigate to={`/group/${groupId}`} replace />;
  }

  const totalItems = items.length;
  const checkedCount = items.filter((i) => i.status === "bought").length;
  const remainingCount = totalItems - checkedCount;
  const progressPct = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="relative min-h-screen pb-32">
      {/* ---- Blue header ---- */}
      <div className="bg-[#0d74ce] px-4 py-3 flex items-center gap-3 -mx-4 -mt-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label={t("shopper.backToGroup")}
          className="text-white hover:bg-white/20 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold text-white uppercase tracking-wide">
          {t("shopper.title")}
        </h2>
      </div>

      {/* ---- Progress bar ---- */}
      <div className="space-y-1 px-4 pt-4">
        <div className="h-2 bg-[#e6f4fe] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0d74ce] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-[#82827c]">
          {t("shopper.itemsChecked", { checked: checkedCount, total: totalItems })}
        </p>
      </div>

      {/* ---- Offline banner (US-08-T06) ---- */}
      <div className="px-4 pt-3">
        <OfflineBanner isOnline={isOnline} />
      </div>

      {/* ---- Inline add form (toggled by FAB) ---- */}
      {showAddForm && (
        <div className="px-4 pt-3">
          <AddItemForm
            onAdd={addItem}
            disabled={!isOnline}
            addedDuringTripId={activeTrip.id}
            suggestions={suggestions}
          />
        </div>
      )}

      {/* ---- Empty state ---- */}
      {totalItems === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t("shopper.noItems")}</p>
          <p className="text-xs mt-1">{t("shopper.tapToAdd")}</p>
        </div>
      )}

      {/* ---- Still needed section ---- */}
      {pendingGroups.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-[#82827c] uppercase tracking-wide px-4 mb-1">
            {pendingGroups.length !== 1 ? t("shopper.stillNeededPlural", { count: pendingGroups.length }) : t("shopper.stillNeeded", { count: pendingGroups.length })}
          </h3>
          <div className="space-y-2 px-4">
            {pendingGroups.map((group) => (
              <ShopperGroupCard
                key={group.key}
                group={group}
                householdMap={householdMap}
                activeTripId={activeTrip.id}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- In basket section ---- */}
      {boughtGroups.length > 0 && (
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-[#82827c] uppercase tracking-wide px-4 mb-1">
            {boughtGroups.length !== 1 ? t("shopper.inBasketPlural", { count: boughtGroups.length }) : t("shopper.inBasket", { count: boughtGroups.length })}
          </h3>
          <div className="space-y-2 px-4">
            {boughtGroups.map((group) => (
              <ShopperGroupCard
                key={group.key}
                group={group}
                householdMap={householdMap}
                activeTripId={activeTrip.id}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- FAB: add item ---- */}
      <button
        type="button"
        onClick={() => setShowAddForm((v) => !v)}
        className="fixed bottom-28 end-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d74ce] text-white shadow-lg active:scale-95 transition-transform"
        aria-label={t("items.addItem")}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ---- Bottom bar: Complete Trip + helper text ---- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#f0f0f0] px-4 py-3 space-y-1.5 z-10">
        <Button
          className="w-full rounded-xl bg-[#3e332e] text-white hover:bg-[#3e332e]/90 h-12 text-base font-semibold"
          onClick={handleCompleteTrip}
          disabled={completing}
        >
          {completing ? (
            <Loader2 className="h-5 w-5 animate-spin me-2" />
          ) : null}
          {completing ? t("shopper.finishing") : t("shopper.completeTrip")}
        </Button>
        {remainingCount > 0 && (
          <p className="text-xs text-center text-[#82827c]">
            {remainingCount !== 1 ? t("shopper.uncheckedPlural", { count: remainingCount }) : t("shopper.unchecked", { count: remainingCount })}
          </p>
        )}
      </div>
    </div>
  );
}
