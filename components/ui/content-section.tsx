"use client"

import { ReactNode } from "react"
import { GlassCard } from "@/components/atoms/glass-card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ContentSectionProps {
  children: ReactNode
  title?: string
  subtitle?: string
  icon?: LucideIcon
  badge?: {
    text: string
    variant?: "default" | "success" | "warning" | "error"
  }
  actions?: ReactNode
  className?: string
  contentClassName?: string
  variant?: "card" | "plain"
  size?: "sm" | "md" | "lg"
}

export function ContentSection({
  children,
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  className,
  contentClassName,
  variant = "card",
  size = "md"
}: ContentSectionProps) {
  const sizeClasses = {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8"
  }

  const badgeVariants = {
    default: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
    success: "bg-green-500/20 text-green-300 border-green-400/30",
    warning: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
    error: "bg-red-500/20 text-red-300 border-red-400/30"
  }

  const header = (title || subtitle || Icon || badge || actions) && (
    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 sm:mb-6">
      <div className="flex flex-col space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 min-w-0">
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold text-white truncate">
                {title}
              </h2>
            )}
            {badge && (
              <Badge className={cn(badgeVariants[badge.variant || "default"], "text-xs self-start sm:self-auto")}>
                {badge.text}
              </Badge>
            )}
          </div>
        </div>
        {subtitle && (
          <p className="text-gray-400 text-sm ml-0 sm:ml-11">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          {actions}
        </div>
      )}
    </div>
  )

  const content = (
    <div className={cn("space-y-4", contentClassName)}>
      {header}
      {children}
    </div>
  )

  if (variant === "plain") {
    return (
      <div className={cn("space-y-4", className)}>
        {content}
      </div>
    )
  }

  return (
    <GlassCard className={cn(sizeClasses[size], className)}>
      {content}
    </GlassCard>
  )
} 