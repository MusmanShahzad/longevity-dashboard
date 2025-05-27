 "use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface ActionButtonProps {
  children: ReactNode
  onClick?: () => void
  icon?: LucideIcon
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  loading?: boolean
  className?: string
  position?: "fixed" | "inline"
  responsive?: boolean
  hideTextOnMobile?: boolean
}

export function ActionButton({
  children,
  onClick,
  icon: Icon,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className,
  position = "inline",
  responsive = true,
  hideTextOnMobile = false
}: ActionButtonProps) {
  const baseClasses = "transition-all duration-200 font-medium"
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl border border-cyan-400/30",
    secondary: "backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30",
    outline: "border-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400 backdrop-blur-xl",
    ghost: "text-gray-400 hover:text-white hover:bg-white/10"
  }

  const sizeClasses = {
    sm: responsive ? "px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" : "px-3 py-2 text-sm",
    md: responsive ? "px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm lg:px-4 lg:py-2.5" : "px-4 py-2.5 text-sm",
    lg: responsive ? "px-3 py-2 text-sm sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 lg:text-base" : "px-6 py-3 text-base"
  }

  const positionClasses = position === "fixed" 
    ? "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 shadow-2xl" 
    : ""

  const responsiveClasses = responsive ? "w-full sm:w-auto" : ""

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        positionClasses,
        responsiveClasses,
        className
      )}
    >
      {Icon && (
        <Icon className={cn(
          "h-4 w-4 flex-shrink-0",
          children && !hideTextOnMobile && "mr-2",
          children && hideTextOnMobile && "mr-2 sm:mr-0 lg:mr-2",
          loading && "animate-spin"
        )} />
      )}
      {children && (
        <span className={hideTextOnMobile ? "inline sm:hidden lg:inline" : ""}>
          {children}
        </span>
      )}
    </Button>
  )
}