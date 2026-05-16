import { X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function Dialog({ children, onOpenChange, open }: DialogProps) {
  React.useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="dialog-overlay" role="dialog">
      <button aria-label="Close dialog" className="dialog-backdrop" onClick={() => onOpenChange(false)} type="button" />
      {children}
    </div>
  );
}

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("dialog-content", className)} {...props} />
));
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("dialog-header", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("dialog-title", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("dialog-description", className)} {...props} />;
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <Button aria-label="Close" onClick={onClose} size="icon" type="button" variant="ghost">
      <X aria-hidden="true" size={17} />
    </Button>
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle };
