import { useEffect, useRef } from "react"
import { renderMarkdown } from "@/lib/markdown-renderer"

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const fragment = renderMarkdown(content)
      containerRef.current.replaceChildren(fragment)
    }
  }, [content])

  return (
    <div 
      ref={containerRef} 
      className={`preview min-h-0 flex-1 overflow-y-auto p-3 ${className}`}
      tabIndex={-1}
    />
  )
}
