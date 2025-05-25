interface MetricDisplayProps {
  label: string
  value: string
  color?: string
}

export function MetricDisplay({ label, value, color = "text-white" }: MetricDisplayProps) {
  return (
    <div className="text-center">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
