import type React from "react"
import { InfoIcon } from "lucide-react"
import { Tooltip } from "@/components/atoms/tooltip"

interface FormGroupProps {
  label: string
  description?: string
  tooltip?: string
  children: React.ReactNode
  required?: boolean
}

export function FormGroup({ label, description, tooltip, children, required }: FormGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-white">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoIcon className="h-4 w-4 text-cyan-400 cursor-help" />
          </Tooltip>
        )}
      </div>
      {description && <p className="text-xs text-gray-400">{description}</p>}
      {children}
    </div>
  )
}
