import type { LucideIcon } from "lucide-react"

interface Alert {
  id: number
  type: string
  title: string
  description: string
  suggestion: string
  icon: LucideIcon
  color: string
}

interface AlertItemProps {
  alert: Alert
}

export function AlertItem({ alert }: AlertItemProps) {
  const Icon = alert.icon

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 mt-0.5 ${alert.color}`} />
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-sm font-medium text-white">{alert.title}</h4>
            <p className="text-xs text-gray-300">{alert.description}</p>
          </div>
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs text-cyan-300">
              <span className="font-medium">AI Suggestion:</span> {alert.suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
