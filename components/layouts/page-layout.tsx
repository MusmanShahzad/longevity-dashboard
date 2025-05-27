 "use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  icon?: ReactNode
  showBackButton?: boolean
  backButtonText?: string
  onBack?: () => void
  showRefreshButton?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
  actions?: ReactNode
  className?: string
  contentClassName?: string
}

export function PageLayout({
  children,
  title,
  subtitle,
  icon,
  showBackButton = false,
  backButtonText,
  onBack,
  showRefreshButton = false,
  onRefresh,
  isRefreshing = false,
  actions,
  className,
  contentClassName
}: PageLayoutProps) {
  return (
    <div className={cn("space-y-4 md:space-y-6", className)}>
      {/* Page Header */}
      <div className="flex flex-col space-y-4 xl:flex-row xl:items-center xl:justify-between xl:space-y-0">
        {/* Left Section: Back Button + Title */}
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4 min-w-0 flex-1">
          {/* Back Button */}
          {showBackButton && onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-gray-400 my-auto hover:text-white hover:bg-white/10 transition-all duration-200 self-start flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backButtonText && <span className="inline sm:hidden md:inline">{backButtonText}</span>}
              <span className="hidden sm:inline md:hidden">Back</span>
            </Button>
          )}
          
          {/* Page Title */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {icon && (
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-white tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-400 text-sm lg:text-base mt-1 line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2 xl:space-x-3 flex-shrink-0">
          {showRefreshButton && onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400 transition-all duration-200 w-full sm:w-auto"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              <span className="inline sm:hidden lg:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              <span className="hidden sm:inline lg:hidden">Refresh</span>
            </Button>
          )}
          {actions && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className={cn("space-y-4 md:space-y-6", contentClassName)}>
        {children}
      </div>
    </div>
  )
}