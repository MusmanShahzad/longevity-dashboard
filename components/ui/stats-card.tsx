 "use client"

import { ReactNode } from "react"
import { GlassCard } from "@/components/atoms/glass-card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  size?: "sm" | "md" | "lg"
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-cyan-400",
  trend,
  className,
  size = "md"
}: StatsCardProps) {
  const sizeClasses = {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8"
  }

  const valueSizeClasses = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl lg:text-3xl",
    lg: "text-2xl sm:text-3xl lg:text-4xl"
  }

  const iconSizeClasses = {
    sm: "p-2",
    md: "p-2 sm:p-3",
    lg: "p-3 sm:p-4"
  }

  const iconSize = {
    sm: "h-4 w-4 sm:h-5 sm:w-5",
    md: "h-5 w-5 sm:h-6 sm:w-6",
    lg: "h-6 w-6 sm:h-7 sm:w-7"
  }

  return (
    <GlassCard className={cn(sizeClasses[size], className)}>
      <div className="flex items-start justify-between space-x-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-400 mb-1 font-medium truncate">
            {title}
          </p>
          <p className={cn(
            "font-bold text-white tracking-tight",
            valueSizeClasses[size]
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center mt-2 text-xs font-medium",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}>
              <span className="mr-1">
                {trend.isPositive ? "↗" : "↘"}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={cn(
            "rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0",
            iconSizeClasses[size],
            iconColor
          )}>
            <Icon className={iconSize[size]} />
          </div>
        )}
      </div>
    </GlassCard>
  )
}