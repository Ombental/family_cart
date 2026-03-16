import { useState } from "react";
import { AlertCircle, LogOut, Loader2 } from "lucide-react";
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
      setError("Failed to leave group. Please check your connection and try again.");
      setLeaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {groupName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your household's pending items will be removed from the shared list.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={leaving}
            onClick={handleLeave}
          >
            {leaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
