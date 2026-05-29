import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 font-mono uppercase tracking-[0.08em] leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        ember:  "text-ember bg-ember/10  border border-ember/30",
        mint:   "text-mint  bg-mint/10   border border-mint/30",
        flame:  "text-flame bg-flame/12  border border-flame/40",
        steel:  "text-steel bg-steel/10  border border-steel/30",
        bone:   "text-bone-muted bg-ink-100 border border-white/[0.08]",
      },
      size: {
        xs: "text-[9.5px] px-1 py-px h-4 rounded-[3px]",
        sm: "text-[10px]  px-1.5 py-0.5 h-[18px] rounded-[3px]",
      },
    },
    defaultVariants: { tone: "bone", size: "sm" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ className, tone, size, ...rest }: BadgeProps) {
  return <span className={cn(badge({ tone, size }), className)} {...rest} />;
}
