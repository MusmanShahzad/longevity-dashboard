import { Calculator, TrendingUp, TrendingDown } from "lucide-react"

interface CalculatedFieldProps {
  label: string
  value: number
  description?: string
  isGood?: boolean
  compact?: boolean
}

export function CalculatedField({ label, value, description, isGood }: CalculatedFieldProps) {
  const displayValue = value.toFixed(1)
  const colorClass = isGood ? "text-green-400" : value > 0 ? "text-yellow-400" : "text-gray-400"
  const bgClass = isGood
    ? "bg-green-500/10 border-green-500/20"
    : value > 0
      ? "bg-yellow-500/10 border-yellow-500/20"
      : "bg-gray-500/10 border-gray-500/20"

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-2xl font-bold ${colorClass}`}>{displayValue}%</span>
          {isGood ? (
            <TrendingUp className="h-5 w-5 text-green-400" />
          ) : value > 0 ? (
            <TrendingDown className="h-5 w-5 text-yellow-400" />
          ) : null}
        </div>
      </div>
      {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
      {value > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-300">
            {isGood
              ? "Excellent sleep efficiency!"
              : value >= 75
                ? "Good sleep efficiency"
                : "Consider improving sleep habits"}
          </div>
        </div>
      )}
    </div>
  )
}
