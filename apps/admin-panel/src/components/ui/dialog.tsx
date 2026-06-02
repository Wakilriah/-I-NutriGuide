import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function Dialog({ children, onOpenChange, open }: DialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-backdrop" />
        {children}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content ref={ref} className={cn("dialog-content", className)} {...props} />
));
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dialog-header", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <DialogPrimitive.Title className={cn("dialog-title", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <DialogPrimitive.Description className={cn("dialog-description", className)} {...props} />;
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <DialogPrimitive.Close asChild>
      <Button aria-label="Close" onClick={onClose} size="icon" type="button" variant="ghost">
        <X aria-hidden="true" size={17} />
      </Button>
    </DialogPrimitive.Close>
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle };
