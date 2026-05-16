import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationButtonProps = ButtonProps & {
  isActive?: boolean;
};

const PaginationButton = React.forwardRef<HTMLButtonElement, PaginationButtonProps>(
  ({ className, isActive, size = "icon", variant = isActive ? "default" : "outline", ...props }, ref) => (
    <Button
      aria-current={isActive ? "page" : undefined}
      className={cn("h-9 min-h-9 w-9 px-0", className)}
      ref={ref}
      size={size}
      variant={variant}
      {...props}
    />
  ),
);
PaginationButton.displayName = "PaginationButton";

const PaginationPrevious = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children = "Previous", className, ...props }, ref) => (
  <Button className={cn("h-9 min-h-9 px-3", className)} ref={ref} variant="outline" {...props}>
    <ChevronLeft aria-hidden="true" size={16} />
    {children}
  </Button>
));
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children = "Next", className, ...props }, ref) => (
  <Button className={cn("h-9 min-h-9 px-3", className)} ref={ref} variant="outline" {...props}>
    {children}
    <ChevronRight aria-hidden="true" size={16} />
  </Button>
));
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center text-slate-500", className)}
    {...props}
  >
    <MoreHorizontal size={17} />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
};
