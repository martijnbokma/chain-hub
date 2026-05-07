import React from "react"

interface ViewContainerProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
}

export function ViewContainer({ children, className = "", glass = true }: ViewContainerProps) {
  const baseClasses = "rounded-2xl border border-hub-border overflow-hidden ring-1 ring-white/5 transition-all duration-300"
  const glassClasses = glass ? "bg-hub-surface-1/40 backdrop-blur-md shadow-xl" : "bg-hub-surface-1"
  
  return (
    <div className={`${baseClasses} ${glassClasses} ${className}`}>
      {children}
    </div>
  )
}
