import { CircleAlert } from "lucide-react";
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-orange-500" />
            Trip Already Active
          </AlertDialogTitle>
          <AlertDialogDescription>
            {shopperHouseholdName} is already on a shopping trip. Only one
            shopping trip can be active at a time. Please wait for them to
            finish.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
