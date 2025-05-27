"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  error?: string
  disabled?: boolean
  disableFuture?: boolean
}

interface CalendarDate {
  date: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
}

export function DateInput({
  value,
  onChange,
  placeholder = "Select date",
  label,
  className,
  error,
  disabled = false,
  disableFuture = false,
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Parse initial value
  useEffect(() => {
    if (value) {
      // Parse date string as local date to avoid timezone issues
      const parts = value.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const day = parseInt(parts[2], 10)
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year, month, day)
          setSelectedDate(date)
          setCurrentMonth(date.getMonth())
          setCurrentYear(date.getFullYear())
        }
      }
    } else {
      setSelectedDate(null)
    }
  }, [value])

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowYearDropdown(false)
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const generateCalendarDays = (): CalendarDate[] => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const daysInPrevMonth = getDaysInMonth(currentMonth - 1, currentYear)
    
    const days: CalendarDate[] = []

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = daysInPrevMonth - i
      const dateObj = new Date(currentYear, currentMonth - 1, date)
      days.push({
        date,
        month: currentMonth - 1,
        year: currentYear,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: disableFuture && dateObj > today
      })
    }

    // Current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      const dateObj = new Date(currentYear, currentMonth, date)
      const isToday = dateObj.toDateString() === today.toDateString()
      const isSelected = selectedDate && dateObj.toDateString() === selectedDate.toDateString()
      const isDisabled = disableFuture && dateObj > today

      days.push({
        date,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isToday,
        isSelected: !!isSelected,
        isDisabled
      })
    }

    // Next month's leading days
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let date = 1; date <= remainingDays; date++) {
      const dateObj = new Date(currentYear, currentMonth + 1, date)
      days.push({
        date,
        month: currentMonth + 1,
        year: currentYear,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: disableFuture && dateObj > today
      })
    }

    return days
  }

  const handleDateSelect = (day: CalendarDate) => {
    if (day.isDisabled || disabled) return

    const newDate = new Date(day.year, day.month, day.date)
    setSelectedDate(newDate)
    
    // Format as YYYY-MM-DD without timezone conversion
    const year = day.year.toString().padStart(4, '0')
    const month = (day.month + 1).toString().padStart(2, '0')
    const date = day.date.toString().padStart(2, '0')
    const formattedDate = `${year}-${month}-${date}`
    
    onChange(formattedDate)
    setIsOpen(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const navigateToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const clearDate = () => {
    setSelectedDate(null)
    onChange("")
    setIsOpen(false)
  }

  // Generate year range (100 years back to current year or future if allowed)
  const generateYearRange = () => {
    const currentYear = today.getFullYear()
    const startYear = currentYear - 100
    const endYear = disableFuture ? currentYear : currentYear + 10
    const years = []
    for (let year = endYear; year >= startYear; year--) {
      years.push(year)
    }
    return years
  }

  const handleYearSelect = (year: number) => {
    setCurrentYear(year)
    setShowYearDropdown(false)
  }

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(month)
    setShowMonthDropdown(false)
  }

  const navigateDecade = (direction: 'prev' | 'next') => {
    const change = direction === 'prev' ? -10 : 10
    setCurrentYear(currentYear + change)
  }

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <Label className="block text-sm font-medium text-white mb-2">
          {label}
        </Label>
      )}

             {/* Input Trigger */}
       <div
         className={cn(
           "relative cursor-pointer transition-all duration-300",
           "backdrop-blur-sm bg-white/5 border border-white/20 rounded-lg",
           "hover:bg-white/10 hover:border-white/30",
           "focus-within:ring-2 focus-within:ring-cyan-400 focus-within:border-cyan-400",
           selectedDate && "bg-white/10 border-cyan-400/50",
           error && "border-red-400 bg-red-500/10 focus-within:ring-red-400 focus-within:border-red-400",
           disabled && "opacity-50 cursor-not-allowed hover:bg-white/5"
         )}
         onClick={() => !disabled && setIsOpen(!isOpen)}
       >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
            <span className={cn(
              "text-sm",
              selectedDate ? "text-white" : "text-gray-400"
            )}>
              {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
            </span>
          </div>
          
          {selectedDate && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearDate()
              }}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

             {/* Calendar Dropdown */}
       {isOpen && (
         <div className="absolute top-full left-0 right-0 mt-2 z-50">
           <div className="backdrop-blur-xl bg-gray-900/95 border border-white/30 rounded-2xl shadow-2xl p-4">
                        {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-white/20 text-gray-300 hover:text-white transition-colors border border-white/10 hover:border-white/30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-2">
                {/* Month Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMonthDropdown(!showMonthDropdown)
                      setShowYearDropdown(false)
                    }}
                    className="px-3 py-1 text-lg font-semibold text-white hover:bg-white/20 rounded-lg transition-colors border border-white/10 hover:border-white/30"
                  >
                    {months[currentMonth]}
                  </button>
                  
                  {showMonthDropdown && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900/95 backdrop-blur-xl border border-white/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {months.map((month, index) => (
                        <button
                          key={month}
                          type="button"
                          onClick={() => handleMonthSelect(index)}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-white/20 transition-colors",
                            index === currentMonth && "bg-cyan-500/30 text-cyan-200"
                          )}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearDropdown(!showYearDropdown)
                      setShowMonthDropdown(false)
                    }}
                    className="px-3 py-1 text-lg font-semibold text-white hover:bg-white/20 rounded-lg transition-colors border border-white/10 hover:border-white/30"
                  >
                    {currentYear}
                  </button>
                  
                  {showYearDropdown && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-gray-900/95 backdrop-blur-xl border border-white/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {/* Decade Navigation */}
                      <div className="flex items-center justify-between p-2 border-b border-white/10 bg-white/5">
                        <button
                          type="button"
                          onClick={() => navigateDecade('prev')}
                          className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        >
                          -10 years
                        </button>
                        <span className="text-xs text-gray-400">
                          {Math.floor(currentYear / 10) * 10}s
                        </span>
                        <button
                          type="button"
                          onClick={() => navigateDecade('next')}
                          className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        >
                          +10 years
                        </button>
                      </div>
                      
                      {/* Year List */}
                      {generateYearRange().map((year) => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => handleYearSelect(year)}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-white/20 transition-colors",
                            year === currentYear && "bg-cyan-500/30 text-cyan-200"
                          )}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={navigateToToday}
                  className="px-3 py-1 text-xs rounded-full bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 transition-colors border border-cyan-400/30"
                >
                  Today
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-white/20 text-gray-300 hover:text-white transition-colors border border-white/10 hover:border-white/30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isClickable = !day.isDisabled && !disabled
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => isClickable && handleDateSelect(day)}
                    disabled={day.isDisabled || disabled}
                    className={cn(
                      "relative h-10 w-full rounded-lg text-sm font-medium transition-all duration-200",
                      "flex items-center justify-center",
                      
                      // Base styles
                      day.isCurrentMonth 
                        ? "text-white" 
                        : "text-gray-500",
                      
                                             // Interactive states
                       isClickable && "hover:bg-white/20 hover:scale-105",
                       
                       // Today styling
                       day.isToday && !day.isSelected && "bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-400/70",
                      
                                             // Selected styling
                       day.isSelected && "bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg ring-2 ring-cyan-300 font-bold",
                      
                      // Disabled styling
                      day.isDisabled && "opacity-30 cursor-not-allowed",
                      
                      // Non-current month
                      !day.isCurrentMonth && "opacity-50"
                    )}
                  >
                    {day.date}
                    
                    {/* Selected indicator */}
                    {day.isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    
                    {/* Today indicator */}
                    {day.isToday && !day.isSelected && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

                        {/* Quick Age Presets for Birthdate Selection */}
            {disableFuture && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-xs text-gray-400 mb-2">Quick age selection:</div>
                <div className="flex flex-wrap gap-1">
                  {[20, 25, 30, 35, 40, 45, 50, 60, 70, 80].map((age) => {
                    const birthYear = today.getFullYear() - age
                    return (
                      <button
                        key={age}
                        type="button"
                        onClick={() => {
                          setCurrentYear(birthYear)
                          setCurrentMonth(today.getMonth())
                        }}
                        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-cyan-500/30 text-gray-300 hover:text-cyan-200 transition-colors border border-white/10 hover:border-cyan-400/30"
                      >
                        {age}y
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <div className="text-xs text-gray-400">
                {disableFuture ? "Selecting birthdate" : "Date selection"}
              </div>
              
              <div className="flex items-center space-x-2">
                {selectedDate && (
                  <button
                    type="button"
                    onClick={clearDate}
                    className="px-3 py-1 text-xs rounded-lg bg-red-500/30 text-red-200 hover:bg-red-500/50 transition-colors border border-red-400/30"
                  >
                    Clear
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 text-xs rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors border border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-1 mt-2">
          <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {selectedDate && !error && (
        <div className="flex items-center space-x-1 mt-2">
          <div className="w-1 h-1 bg-green-400 rounded-full" />
          <span className="text-xs text-green-400">Date selected</span>
        </div>
      )}
    </div>
  )
}
