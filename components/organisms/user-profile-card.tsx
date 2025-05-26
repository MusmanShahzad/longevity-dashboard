"use client"

import { User, Calendar, MapPin, Phone, Edit, RefreshCw } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { useMetrics } from "@/lib/hooks/use-metrics"
import type { User as UserType } from "@/lib/supabase"
import { calculateAge } from "@/lib/supabase"

interface UserProfileCardProps {
  user: UserType
  onEditProfile?: () => void
  onSyncData?: () => void
}

// Reusable Components
const ProfileAvatar = ({ user }: { user: UserType }) => (
  <div className="text-center mb-6">
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 mx-auto mb-4 flex items-center justify-center">
      <User className="h-10 w-10 text-white" />
    </div>
    <h4 className="text-xl font-semibold text-white">{user.full_name}</h4>
    <p className="text-sm text-gray-300">Health Tracker</p>
  </div>
)

const ProfileDetail = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string 
}) => (
  <div className="flex items-center space-x-3 text-sm">
    <Icon className="h-4 w-4 text-cyan-400" />
    <span className="text-gray-300">{label}:</span>
    <span className="text-white font-medium">{value}</span>
  </div>
)

const MetricsPreview = ({ userId }: { userId: string }) => {
  const { data: metrics, isLoading } = useMetrics(userId)

  if (isLoading) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded mb-2"></div>
          <div className="h-3 bg-white/10 rounded"></div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
      <h5 className="text-sm font-medium text-white mb-2">Quick Stats</h5>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-400">Sleep Data:</span>
          <span className="text-cyan-400 ml-1">{metrics.sleepDataCount} entries</span>
        </div>
        <div>
          <span className="text-gray-400">Avg Sleep:</span>
          <span className="text-cyan-400 ml-1">{metrics.avgSleepHours.toFixed(1)}h</span>
        </div>
        {metrics.avgShieldScore > 0 && (
          <div>
            <span className="text-gray-400">SHIELD:</span>
            <span className="text-cyan-400 ml-1">{metrics.avgShieldScore}</span>
          </div>
        )}
        {metrics.bioAgeDelta !== 0 && (
          <div>
            <span className="text-gray-400">Bio Age:</span>
            <span className={`ml-1 ${metrics.bioAgeDelta < 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {metrics.bioAgeDelta > 0 ? '+' : ''}{metrics.bioAgeDelta}y
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function UserProfileCard({ user, onEditProfile, onSyncData }: UserProfileCardProps) {
  const age = user.date_of_birth ? calculateAge(user.date_of_birth) : null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <User className="h-6 w-6 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Profile</h3>
      </div>

      <ProfileAvatar user={user} />

      <div className="space-y-4">
        {age && (
          <ProfileDetail
            icon={Calendar}
            label="Age"
            value={`${age} years`}
          />
        )}

        {user.date_of_birth && (
          <ProfileDetail
            icon={Calendar}
            label="Born"
            value={formatDate(user.date_of_birth)}
          />
        )}

        {user.sex && (
          <ProfileDetail
            icon={User}
            label="Sex"
            value={user.sex.charAt(0).toUpperCase() + user.sex.slice(1)}
          />
        )}

        {user.location && (
          <ProfileDetail
            icon={MapPin}
            label="Location"
            value={user.location}
          />
        )}

        <ProfileDetail
          icon={Phone}
          label="Joined"
          value={formatDate(user.created_at)}
        />
      </div>

      <MetricsPreview userId={user.id} />
    </GlassCard>
  )
}
