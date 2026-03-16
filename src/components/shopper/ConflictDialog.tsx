import { CircleAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopperHouseholdName: string;
}

/**
 * Dialog shown when attempting to start Shopper Mode while another
 * household already has an active shopping trip (US-07 conflict).
 *
 * Single "Got it" action to dismiss — no destructive or secondary actions.
 */
export function ConflictDialog({
  open,
  onOpenChange,
  shopperHouseholdName,
}: ConflictDialogProps) {
  const { t } = useLanguage();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-orange-500" />
            {t("conflict.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("conflict.desc", { name: shopperHouseholdName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            {t("common.gotIt")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
