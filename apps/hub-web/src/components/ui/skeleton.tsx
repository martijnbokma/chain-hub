import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
