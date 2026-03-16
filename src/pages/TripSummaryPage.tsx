import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGroup } from "@/hooks/useGroup";
import { useTripHistory } from "@/hooks/useTripHistory";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Household } from "@/types/group";
import type { PurchasedItemSnapshot } from "@/types/trip";
import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------

function formatCompletedDate(ts: Timestamp | null, lang: string, t: (key: string) => string): string {
  if (!ts) return t("common.unknownDate");
  const date = ts.toDate();
  return date.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Types for grouped items
// ---------------------------------------------------------------------------

interface HouseholdGroup {
  householdId: string;
  householdName: string;
  householdColor: string;
  items: PurchasedItemSnapshot[];
}

// ---------------------------------------------------------------------------
// TripSummaryPage
// ---------------------------------------------------------------------------

/**
 * Trip Summary page -- detailed view of a completed trip.
 *
 * Rendered at /group/:groupId/trip/:tripId. Shows a green-themed
 * completion screen with purchased items grouped by household.
 *
 * Accessible to all group members, not just the Shopper.
 */
export function TripSummaryPage() {
  const { groupId, tripId } = useParams<{
    groupId: string;
    tripId: string;
  }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { trips, loading: tripsLoading } = useTripHistory(groupId);
  const { households, loading: groupLoading } = useGroup(groupId);

  const trip = useMemo(
    () => trips.find((tr) => tr.id === tripId) ?? null,
    [trips, tripId]
  );

  const householdMap = useMemo(
    () => new Map<string, Household>(households.map((h) => [h.id, h])),
    [households]
  );

  // Group purchased items by household
  const householdGroups = useMemo((): HouseholdGroup[] => {
    if (!trip) return [];

    const groupMap = new Map<string, PurchasedItemSnapshot[]>();

    for (const item of trip.purchasedItems) {
      const existing = groupMap.get(item.householdId) ?? [];
      existing.push(item);
      groupMap.set(item.householdId, existing);
    }

    return Array.from(groupMap.entries()).map(([hId, items]) => {
      const household = householdMap.get(hId);
      return {
        householdId: hId,
        householdName: household?.name ?? "Unknown Household",
        householdColor: household?.color ?? "#9ca3af",
        items,
      };
    });
  }, [trip, householdMap]);

  const totalPurchased = trip?.purchasedItems.length ?? 0;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleHousehold = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDone = useCallback(() => {
    navigate(`/group/${groupId}`, { replace: true });
  }, [navigate, groupId]);

  const handleBack = useCallback(() => {
    navigate(`/group/${groupId}/trips`);
  }, [navigate, groupId]);

  const loading = tripsLoading || groupLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight">{t("trips.summaryTitle")}</h2>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t("trips.notFound")}</p>
        </div>
      </div>
    );
  }

  const shopperName = trip.startedByUserName || trip.startedByHouseholdName;
  const dateLabel = formatCompletedDate(trip.completedAt, lang, t);

  return (
    <div className="min-h-screen pb-28">
      {/* ---- Green header ---- */}
      <div className="bg-[#30a46c] px-4 py-3 flex items-center gap-3 -mx-4 -mt-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label={t("trips.backToHistory")}
          className="text-white hover:bg-white/20 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold text-white uppercase tracking-wide">
          {t("trips.summaryTitle")}
        </h2>
      </div>

      {/* ---- Completion hero ---- */}
      <div className="flex flex-col items-center pt-8 pb-4 space-y-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f9ed]">
          <CheckCircle2 className="h-10 w-10 text-[#30a46c]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#1a1a1a]">
          {t("trips.complete")}
        </h1>
        <p className="text-sm text-[#82827c]">
          {dateLabel} &mdash; by {shopperName}
        </p>
      </div>

      {/* ---- Summary card ---- */}
      <div className="px-4 space-y-4">
        <Card className="border-[#f0f0f0]">
          <CardContent className="space-y-4 pt-5">
            {/* Overall count */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {t("trips.summaryTitle")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#82827c]">{t("trips.itemsPurchasedLabel")}</span>
              <span className="text-lg font-bold text-[#1a1a1a]">
                {totalPurchased}
              </span>
            </div>

            {/* Per-household breakdown */}
            {householdGroups.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
                <span className="text-xs font-semibold text-[#82827c] uppercase tracking-wide">
                  {t("trips.perHousehold")}
                </span>
                {householdGroups.map((hg) => {
                  const isExpanded = expandedIds.has(hg.householdId);
                  return (
                    <div key={hg.householdId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-1.5"
                        aria-expanded={isExpanded}
                        aria-controls={`hh-items-${hg.householdId}`}
                        onClick={() => toggleHousehold(hg.householdId)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hg.householdColor }}
                            aria-hidden="true"
                          />
                          <span className="text-sm text-[#1a1a1a] truncate">
                            {hg.householdName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-medium text-[#1a1a1a]">
                            {hg.items.length !== 1 ? t("common.itemsPlural", { count: hg.items.length }) : t("common.items", { count: hg.items.length })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#82827c] transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#82827c] transition-transform duration-200" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div
                          id={`hh-items-${hg.householdId}`}
                          role="region"
                          className="pb-2"
                        >
                          {hg.items.map((item, idx) => (
                            <div
                              key={idx}
                              className={`py-2 ps-3 ${idx !== hg.items.length - 1 ? "border-b border-[#eff1ef]" : ""}`}
                              style={{
                                borderInlineStartWidth: 4,
                                borderInlineStartStyle: "solid",
                                borderInlineStartColor: hg.householdColor,
                              }}
                            >
                              <span className="text-[15px] font-semibold text-[#202020]">
                                {item.name}
                              </span>
                              {item.qty > 0 && (
                                <p className="text-[11px] text-[#8e8c99]">
                                  {t("items.qty", { label: item.qty + (item.unit ? ` · ${t("units." + item.unit)}` : "") })}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {householdGroups.length === 0 && (
              <p className="text-sm text-[#82827c] text-center py-2">
                {t("trips.noItemsPurchased")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Done button (fixed bottom) ---- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#f0f0f0] px-4 py-3 z-10">
        <Button
          className="w-full rounded-xl bg-[#3e332e] text-white hover:bg-[#3e332e]/90 h-12 text-base font-semibold"
          onClick={handleDone}
        >
          {t("trips.done")}
        </Button>
      </div>
    </div>
  );
}
