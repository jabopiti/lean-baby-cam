import { useEffect, useState } from "react";
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

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function EndSessionDialog({ open, onOpenChange, onConfirm }: EndSessionDialogProps) {
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (!open) {
      setCountdown(2);
      return;
    }
    setCountdown(2);
    const t1 = window.setTimeout(() => setCountdown(1), 1000);
    const t2 = window.setTimeout(() => setCountdown(0), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End monitoring session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop the camera and microphone and disconnect the other device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep monitoring</AlertDialogCancel>
          <AlertDialogAction
            disabled={countdown > 0}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
          >
            {countdown > 0 ? `Yes, end session (${countdown})` : "Yes, end session"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
