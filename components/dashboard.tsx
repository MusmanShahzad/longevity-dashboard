"use client"
import { ShieldScoreCard } from "@/components/organisms/shield-score-card"
import { BioAgeDeltaCard } from "@/components/organisms/bio-age-delta-card"
import { HealthAlertsCard } from "@/components/organisms/health-alerts-card"
import { SleepChartsCard } from "@/components/organisms/sleep-charts-card"
import { UserProfileCard } from "@/components/organisms/user-profile-card"
import { LabUploadCard } from "@/components/organisms/lab-upload-card"
import { BiomarkerAnalysisCard } from "@/components/organisms/biomarker-analysis-card"
import { useUser } from "@/app/contexts/user-context"
import type { User } from "@/lib/supabase"

interface DashboardProps {
  currentUser?: User // Make optional since we'll get it from context
  key?: number // Add key prop for refresh handling
}

export function Dashboard({ currentUser: propCurrentUser }: DashboardProps) {
  const { currentUser: contextCurrentUser } = useUser()
  
  // Use context user if available, otherwise fall back to prop (for backward compatibility)
  const currentUser = contextCurrentUser || propCurrentUser
  
  if (!currentUser) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No user data available</h2>
          <p>Please select a user to view their dashboard.</p>
        </div>
      </div>
    )
  }
  // Remove: const [refreshKey, setRefreshKey] = useState(0)
  // Remove: const handleDataUpdate = () => { setRefreshKey((prev) => prev + 1) }

  return (
    <div className="space-y-6">
            {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <ShieldScoreCard userId={currentUser.id} />
              <BioAgeDeltaCard userId={currentUser.id} />
            </div>

            {/* Charts Section */}
            <SleepChartsCard userId={currentUser.id} />

            {/* Health Alerts */}
            <HealthAlertsCard userId={currentUser.id} />

            {/* Biomarker Analysis */}
            <BiomarkerAnalysisCard userId={currentUser.id} />
          </div>

                  {/* Right Column */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <UserProfileCard user={currentUser} />
            <LabUploadCard userId={currentUser.id} />
          </div>
        </div>
      </div>
    )
}
