"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  error?: string
  disabled?: boolean
}

export function DateInput({
  value,
  onChange,
  placeholder = "Select date",
  label,
  className,
  error,
  disabled = false,
}: DateInputProps) {
  const [month, setMonth] = useState<string>("")
  const [day, setDay] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const isInitializing = useRef(false)

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  // Generate years (current year + 10 to current year - 100)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 111 }, (_, i) => currentYear + 10 - i)

  // Generate days based on selected month and year
  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) return 31
    const daysInMonth = new Date(Number.parseInt(year), Number.parseInt(month), 0).getDate()
    return daysInMonth
  }

  const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1)

  // Update parent component when date changes
  useEffect(() => {
    if (isInitializing.current) {
      return
    }
    
    if (month && day && year) {
      const formattedDate = `${year}-${month}-${day}`
      if (formattedDate !== value) {
        onChange(formattedDate)
      }
    } else if (value !== "") {
      onChange("")
    }
  }, [month, day, year, value, onChange])

  // Parse initial value
  useEffect(() => {
    isInitializing.current = true
    
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setMonth((date.getMonth() + 1).toString().padStart(2, "0"))
        setDay(date.getDate().toString().padStart(2, "0"))
        setYear(date.getFullYear().toString())
      }
    } else {
      setMonth("")
      setDay("")
      setYear("")
    }
    
    // Allow updates after initialization
    setTimeout(() => {
      isInitializing.current = false
    }, 0)
  }, [value])

  // Reset day if it's invalid for the selected month
  useEffect(() => {
    if (day && month && year) {
      const maxDays = getDaysInMonth(month, year)
      if (Number.parseInt(day) > maxDays) {
        setDay("")
      }
    }
  }, [month, year, day])

  const isComplete = month && day && year

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <Label className="block text-sm font-medium text-gray-300">
          {label}
        </Label>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* Month Selector */}
        <div className="space-y-2">
          <Select value={month} onValueChange={setMonth} disabled={disabled}>
            <SelectTrigger 
              className={cn(
                "h-[50px] bg-white/5 border-white/20 text-white hover:bg-white/10",
                "hover:border-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400",
                "backdrop-blur-sm transition-all duration-200",
                !month && "text-gray-400",
                error && "border-red-400 bg-red-500/10 focus:ring-red-400 focus:border-red-400",
                disabled && "opacity-50 cursor-not-allowed hover:bg-white/5"
              )}
            >
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 border-white/20 text-white">
              {months.map((m) => (
                <SelectItem 
                  key={m.value} 
                  value={m.value}
                  className="text-white hover:bg-white/10 focus:bg-cyan-500/20"
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day Selector */}
        <div className="space-y-2">
          <Select value={day} onValueChange={setDay} disabled={!month || !year || disabled}>
            <SelectTrigger 
              className={cn(
                "h-[50px] bg-white/5 border-white/20 text-white hover:bg-white/10",
                "hover:border-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400",
                "backdrop-blur-sm transition-all duration-200",
                !day && "text-gray-400",
                error && "border-red-400 bg-red-500/10 focus:ring-red-400 focus:border-red-400",
                (disabled || (!month || !year)) && "opacity-50 cursor-not-allowed hover:bg-white/5"
              )}
            >
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 border-white/20 text-white max-h-[200px]">
              {days.map((d) => (
                <SelectItem 
                  key={d} 
                  value={d.toString().padStart(2, "0")}
                  className="text-white hover:bg-white/10 focus:bg-cyan-500/20"
                >
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Selector */}
        <div className="space-y-2">
          <Select value={year} onValueChange={setYear} disabled={disabled}>
            <SelectTrigger 
              className={cn(
                "h-[50px] bg-white/5 border-white/20 text-white hover:bg-white/10",
                "hover:border-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400",
                "backdrop-blur-sm transition-all duration-200",
                !year && "text-gray-400",
                error && "border-red-400 bg-red-500/10 focus:ring-red-400 focus:border-red-400",
                disabled && "opacity-50 cursor-not-allowed hover:bg-white/5"
              )}
            >
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 border-white/20 text-white max-h-[200px]">
              {years.map((y) => (
                <SelectItem 
                  key={y} 
                  value={y.toString()}
                  className="text-white hover:bg-white/10 focus:bg-cyan-500/20"
                >
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Indicators */}
      {error && (
        <div className="flex items-center space-x-1 mt-2">
          <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {isComplete && !error && (
        <div className="flex items-center space-x-1 mt-2">
          <div className="w-1 h-1 bg-green-400 rounded-full" />
          <span className="text-xs text-green-400">Date selected</span>
        </div>
      )}

      {!isComplete && !error && (
        <div className="flex items-center space-x-1 mt-2">
          <CalendarIcon className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-500">Select month, day, and year</span>
        </div>
      )}
    </div>
  )
}
