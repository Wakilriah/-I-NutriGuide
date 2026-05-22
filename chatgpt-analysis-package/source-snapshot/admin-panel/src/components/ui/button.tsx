import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-dark",
        destructive: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
        outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        secondary: "bg-brand-soft text-brand hover:bg-emerald-100",
        ghost: "text-slate-700 hover:bg-slate-100",
      },
      size: {
        default: "px-4 py-2",
        sm: "min-h-9 px-3",
        lg: "min-h-11 px-5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ asChild = false, className, size, variant, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
