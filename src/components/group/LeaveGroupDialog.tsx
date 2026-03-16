import { useState } from "react";
import { AlertCircle, LogOut, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeaveGroupDialogProps {
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

/**
 * AlertDialog that warns the user about the consequences of leaving a group
 * and confirms the action.
 *
 * US-00d-T04: Warning modal with item-loss explanation.
 */
export function LeaveGroupDialog({
  groupName,
  open,
  onOpenChange,
  onConfirm,
}: LeaveGroupDialogProps) {
  const { t } = useLanguage();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLeaving(true);
    setError(null);
    try {
      await onConfirm();
      // Dialog will unmount on navigation, but close it just in case
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to leave group:", err);
      setError(t("leave.failed"));
      setLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leave.title", { groupName })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("leave.desc")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={leaving}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={leaving}
            onClick={handleLeave}
          >
            {leaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t("leave.leaving")}
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 me-2" />
                {t("group.leaveGroup")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
