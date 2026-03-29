import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-1 text-[10px] font-medium tracking-[0.16em] uppercase", {
  variants: {
    variant: {
      default: "border border-border bg-white text-slate-700",
      muted: "border border-border bg-slate-50 text-slate-600",
      success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      warning: "border border-amber-200 bg-amber-50 text-amber-700",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
