"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — the instrument-panel switch.
 *
 * The visual rules:
 *   - 28/32/40 px tall (compact by default, instruments don't waste space)
 *   - 1px hairline border, never default Tailwind border
 *   - Press: 1px Y-translate (no scale) + 80ms ease-in
 *   - Primary "ember" variant carries a soft amber glow on hover
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center select-none whitespace-nowrap",
    "font-sans text-[12.5px] leading-none tracking-[-0.01em]",
    "transition-[transform,background,border,box-shadow,color] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-1 focus-visible:ring-offset-ink",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "active:translate-y-px",
  ],
  {
    variants: {
      variant: {
        ember: [
          "bg-ember text-ink-50",
          "border border-ember/80",
          "hover:bg-ember-50/40 hover:text-ember-50 hover:shadow-ember",
          "shadow-[0_0_0_1px_rgb(var(--ember)/0.6),0_1px_0_rgb(0_0_0/0.3)]",
        ],
        ghost: [
          "bg-transparent text-bone",
          "border border-transparent hover:border-white/[0.08]",
          "hover:bg-ink-100",
        ],
        plate: [
          "bg-ink-100 text-bone",
          "border border-white/[0.06] hover:border-white/[0.12]",
          "hover:bg-ink-200",
        ],
        outline: [
          "bg-transparent text-bone",
          "border border-white/[0.14] hover:border-white/[0.28]",
          "hover:bg-white/[0.02]",
        ],
        danger: [
          "bg-flame/15 text-flame",
          "border border-flame/40 hover:bg-flame/25",
        ],
        link: [
          "bg-transparent text-steel hover:text-bone",
          "underline-offset-4 hover:underline",
          "border border-transparent",
        ],
      },
      size: {
        xs: "h-6  px-2 text-[11px] gap-1.5 rounded-sm",
        sm: "h-7  px-2.5 gap-1.5 rounded-sm",
        md: "h-8  px-3   gap-2",
        lg: "h-10 px-4   gap-2 text-sm rounded-md",
        icon: "h-8 w-8 p-0 gap-0",
      },
    },
    defaultVariants: { variant: "plate", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
