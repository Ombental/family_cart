import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/i18n/LanguageContext";

interface SyncBannerProps {
  isOnline: boolean;
}

/**
 * Offline / sync-failure banner.
 *
 * Renders a persistent amber alert when the browser reports offline status.
 * Hidden when online.
 */
export function SyncBanner({ isOnline }: SyncBannerProps) {
  const { t } = useLanguage();
  if (isOnline) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        {t("offline.syncBanner")}
      </AlertDescription>
    </Alert>
  );
}
