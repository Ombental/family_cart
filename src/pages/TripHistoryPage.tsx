import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardList,
  Loader2,
  Package,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTripHistory } from "@/hooks/useTripHistory";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Trip } from "@/types/trip";
import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Date formatting helpers
// ---------------------------------------------------------------------------

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function formatTripDate(ts: Timestamp | null, lang: string, t: (key: string) => string): string {
  if (!ts) return t("common.unknownDate");
  const date = ts.toDate();
  if (isToday(date)) return t("trips.today");
  if (isYesterday(date)) return t("trips.yesterday");
  return date.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// TripHistoryPage
// ---------------------------------------------------------------------------

/**
 * Trip History page — lists completed trips for the group.
 *
 * Rendered at /group/:groupId/trips. Displays a reverse-chronological
 * list of completed shopping trips. Each card links to the detailed
 * trip summary page.
 */
export function TripHistoryPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { trips, loading } = useTripHistory(groupId);
  const { t, lang } = useLanguage();

  const handleBack = useCallback(() => {
    navigate(`/group/${groupId}`);
  }, [navigate, groupId]);

  const handleTripClick = useCallback(
    (tripId: string) => {
      navigate(`/group/${groupId}/trip/${tripId}`);
    },
    [navigate, groupId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("trips.history")}
          </h2>
        </div>
      </div>

      {/* Trip list or empty state */}
      {trips.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t("trips.noTrips")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip: Trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              lang={lang}
              t={t}
              onClick={() => handleTripClick(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TripCard
// ---------------------------------------------------------------------------

interface TripCardProps {
  trip: Trip;
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onClick: () => void;
}

function TripCard({ trip, lang, t, onClick }: TripCardProps) {
  const itemCount = trip.purchasedItems.length;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f9ed] shrink-0">
          <ShoppingCart className="h-5 w-5 text-[#30a46c]" />
        </div>
        <div className="min-w-0 flex-1">
          {trip.storeName && (
            <span className="text-sm font-semibold text-[#1a1a1a]">{trip.storeName}</span>
          )}
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {formatTripDate(trip.completedAt, lang, t)}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {t("trips.startedBy", { name: trip.startedByUserName || trip.startedByHouseholdName })}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              {itemCount !== 1 ? t("trips.itemsPurchasedPlural", { count: itemCount }) : t("trips.itemsPurchased", { count: itemCount })}
            </div>
            {trip.split && (
              <span className="inline-flex items-center rounded-full bg-[#e6f9ed] px-2 py-0.5 text-[10px] font-medium text-[#30a46c]">
                {t("trips.split")}
              </span>
            )}
          </div>
        </div>
        {trip.totalAmount != null && (
          <span className="text-base font-bold text-[#1a1a1a] shrink-0">{trip.totalAmount.toFixed(2)}</span>
        )}
        <ChevronRight className="h-4 w-4 text-[#82827c] shrink-0" />
      </CardContent>
    </Card>
  );
}
