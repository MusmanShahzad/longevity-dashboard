import Image from "next/image"
import { GlassCard } from "@/components/atoms/glass-card"

export function Header() {
  return (
    <GlassCard className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image
            src="/longevity-logo.webp"
            alt="Longevity Clinic"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Longevity Clinic®</h1>
            <p className="text-sm text-cyan-300">AI-Powered Health Dashboard</p>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
