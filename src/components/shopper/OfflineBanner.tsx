import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OfflineBannerProps {
  isOnline: boolean;
}

/**
 * Offline banner for Shopper Mode (US-08-T06).
 *
 * Displays a persistent amber alert when the device is offline.
 * Reassures the shopper that check-off operations will sync automatically
 * once connectivity is restored (Firestore IndexedDB persistence handles
 * the offline queue natively).
 *
 * Does NOT block any functionality -- the user can still check off items
 * while offline.
 */
export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        You're offline &mdash; changes will sync when reconnected
      </AlertDescription>
    </Alert>
  );
}
