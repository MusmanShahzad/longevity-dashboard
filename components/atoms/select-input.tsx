"use client"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SelectInput({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select option", 
  className = "",
  disabled = false
}: SelectInputProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          "h-[50px] bg-white/5 border-white/20 text-white hover:bg-white/10",
          "hover:border-white/30 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400",
          "backdrop-blur-sm transition-all duration-200",
          !value && "text-gray-400",
          disabled && "opacity-50 cursor-not-allowed hover:bg-white/5",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-900/95 border-white/20 text-white">
        {options
          .filter((option) => option.value !== "")
          .map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-white hover:bg-white/10 focus:bg-cyan-500/20"
            >
              {option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
