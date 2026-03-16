import { CircleAlert, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
  onRequestToJoin?: () => void;
}

/**
 * Dialog shown when attempting to start Shopper Mode while another
 * household already has an active shopping trip (US-07 conflict).
 *
 * Offers "Request to Join" as primary action, "Got it" as dismiss.
 */
export function ConflictDialog({
  open,
  onOpenChange,
  shopperHouseholdName,
  onRequestToJoin,
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
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t("common.gotIt")}
          </AlertDialogCancel>
          {onRequestToJoin && (
            <AlertDialogAction
              onClick={() => {
                onOpenChange(false);
                onRequestToJoin();
              }}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {t("group.requestToJoin")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
