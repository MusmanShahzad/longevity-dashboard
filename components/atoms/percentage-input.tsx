"use client"

import type React from "react"

import { useState } from "react"

interface PercentageInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  min?: number
  max?: number
  className?: string
}

export function PercentageInput({
  value,
  onChange,
  placeholder,
  min = 0,
  max = 100,
  className = "",
}: PercentageInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number.parseFloat(e.target.value) || 0
    if (newValue > max) return
    if (newValue < min) return
    onChange(newValue)
  }

  return (
    <div className="relative">
      <input
        type="number"
        value={value || ""}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={0.1}
        className={`
          w-full px-4 py-3 pr-12 rounded-lg
          bg-white/5 border border-white/20
          text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent
          hover:bg-white/10 transition-all duration-200
          ${className}
        `}
      />
      <div
        className={`
        absolute right-3 top-1/2 transform -translate-y-1/2
        text-sm font-medium transition-colors duration-200
        ${isFocused ? "text-cyan-400" : "text-gray-400"}
      `}
      >
        %
      </div>
    </div>
  )
}
