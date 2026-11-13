import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("ca-skeleton rounded-2xl", className)}
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
