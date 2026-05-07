import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ContentItem {
  slug: string
  isCore: boolean
  description?: string
}

interface ContentCardProps {
  item: ContentItem
  onClick: (slug: string) => void
}

export function ContentCard({ item, onClick }: ContentCardProps) {
  return (
    <button
      onClick={() => onClick(item.slug)}
      className="group relative flex flex-col p-5 rounded-xl border border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2/80 hover:border-hub-accent/40 hover:shadow-xl hover:shadow-hub-accent/5 transition-all duration-300 text-left overflow-hidden ring-1 ring-white/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`size-2.5 rounded-full ${item.isCore ? "bg-hub-core shadow-[0_0_8px_rgba(139,124,255,0.5)]" : "bg-hub-user shadow-[0_0_8px_rgba(78,224,161,0.5)]"}`} />
        {item.isCore && (
          <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border text-hub-text-faint bg-white/5 uppercase tracking-wider font-bold px-1.5">
            core
          </Badge>
        )}
      </div>
      <span className="text-[1rem] text-hub-text group-hover:text-white font-bold truncate mb-1.5">
        {item.slug}
      </span>
      <p className="text-[0.75rem] text-hub-text-faint line-clamp-2 leading-relaxed min-h-[2.4rem]">
        {item.description || "No description provided."}
      </p>

      <div className="absolute bottom-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 transition-transform">
        <ArrowLeft className="size-4 rotate-180 text-hub-accent" />
      </div>
    </button>
  )
}
