import React from "react"

interface ViewHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function ViewHeader({ title, description, children }: ViewHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col">
        <h1 className="m-0 font-hub-display text-2xl font-bold tracking-tight text-white leading-none">
          {title}
        </h1>
        {description && (
          <p className="text-[0.8rem] text-hub-text-dim mt-1.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  )
}
