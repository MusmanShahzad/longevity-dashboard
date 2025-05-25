"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { HealthDataModal } from "@/components/organisms/health-data-modal"
import { UserEditModal } from "@/components/organisms/user-edit-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useUser as useUserContext } from "@/app/contexts/user-context"
import { useUser } from "@/lib/hooks/use-users"
import type { User as UserType } from "@/lib/api/users"

function UserDashboardContent() {
  const { setCurrentUser } = useUserContext()
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [dashboardKey, setDashboardKey] = useState(0)
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  // Fetch user data using React Query
  const { 
    data: currentUser, 
    isLoading, 
    error 
  } = useUser(userId)

  // Update context when user data is loaded
  useEffect(() => {
    if (currentUser) {
      setCurrentUser(currentUser as any)
    }
  }, [currentUser, setCurrentUser])

  // Handle error or redirect if user not found
  useEffect(() => {
    if (error) {
      console.error("Error fetching user:", error)
      router.push("/")
    }
  }, [error, router])

  const handleBackToManagement = () => {
    router.push("/")
  }

  const handleEditUser = () => {
    setIsEditModalOpen(true)
  }

  const handleUserUpdated = (updatedUser: UserType) => {
    // Convert the updated user to the context format if needed
    setCurrentUser(updatedUser as any)
    setIsEditModalOpen(false)
  }

  // Callback to refresh dashboard data without page reload
  const handleDataUpdate = useCallback(() => {
    setDashboardKey((prev) => prev + 1)
  }, [])

  const handleHealthModalClose = () => {
    setIsHealthModalOpen(false)
    // React Query will automatically refresh data when needed
    handleDataUpdate()
    // refresh the page
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading user dashboard...</span>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">User not found</h2>
          <Button onClick={handleBackToManagement}>
            Back to User Management
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Back Button */}
      <div className="fixed top-6 left-6 z-50">
        <Button
          onClick={handleBackToManagement}
          variant="outline"
          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>

      {/* Dashboard with key for refresh */}
      <Dashboard key={dashboardKey} />

      {/* Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button
          onClick={() => setIsHealthModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg"
        >
          Add Health Data
        </Button>
        <Button
          onClick={handleEditUser}
          variant="outline"
          className="border-purple-400 text-purple-400 hover:bg-purple-400/10 shadow-lg"
        >
          Edit Profile
        </Button>
      </div>

      <HealthDataModal
        isOpen={isHealthModalOpen}
        onClose={handleHealthModalClose}
        currentUser={currentUser as any}
        onDataUpdate={handleDataUpdate}
      />

      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={currentUser as any}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  )
}

export default function UserDashboardPage() {
  return <UserDashboardContent />
} 