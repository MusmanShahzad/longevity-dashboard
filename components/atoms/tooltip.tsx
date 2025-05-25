"use client"

import type React from "react"

import { useState } from "react"

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-xs text-white
            bg-slate-800 border border-white/20 rounded-lg shadow-lg
            backdrop-blur-sm max-w-xs
            ${positionClasses[position]}
          `}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-slate-800 border-white/20 transform rotate-45
              ${position === "top" ? "top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b" : ""}
              ${position === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t" : ""}
              ${position === "left" ? "left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r" : ""}
              ${position === "right" ? "right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l" : ""}
            `}
          />
        </div>
      )}
    </div>
  )
}
