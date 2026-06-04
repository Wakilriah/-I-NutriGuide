import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type ConfirmDialogProps = {
  confirmLabel?: string;
  description: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  isLoading = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="confirm-dialog-content">
        <DialogHeader>
          <div className="confirm-dialog-heading">
            <span className="confirm-dialog-icon" aria-hidden="true">
              <AlertTriangle size={18} />
            </span>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="form-actions p-5">
          <Button disabled={isLoading} onClick={onConfirm} type="button" variant="destructive">
            {isLoading ? "Working" : confirmLabel}
          </Button>
          <Button disabled={isLoading} onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
