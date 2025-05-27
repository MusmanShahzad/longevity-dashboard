"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Dashboard } from "@/components/dashboard"
import { HealthDataModal } from "@/components/organisms/health-data-modal"
import { UserEditModal } from "@/components/organisms/user-edit-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, RefreshCw, Activity, Plus, Settings } from "lucide-react"
import { PageLayout } from "@/components/layouts/page-layout"
import { ActionButton } from "@/components/ui/action-button"
import { useUser as useUserContext } from "@/app/contexts/user-context"
import { useUser } from "@/lib/hooks/use-users"
import { useToast } from "@/hooks/use-toast"
import type { User as UserType } from "@/lib/supabase"

function UserDashboardContent() {
  const { setCurrentUser } = useUserContext()
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [dashboardKey, setDashboardKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
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

    // Comprehensive data refresh function using React Query invalidation
    const handleDataUpdate = useCallback(async () => {
      if (!userId) return
  
      setIsRefreshing(true)
      try {
        // Invalidate all user-related queries to trigger fresh data fetching
        await Promise.all([
          // User data
          queryClient.invalidateQueries({ queryKey: ['users', userId] }),
          
          // Sleep data and metrics
          queryClient.invalidateQueries({ queryKey: ['sleepData', userId] }),
          queryClient.invalidateQueries({ queryKey: ['metrics', userId] }),
          
          // Health alerts and suggestions
          queryClient.invalidateQueries({ queryKey: ['healthAlerts', userId] }),
          
          // Biomarkers and lab reports
          queryClient.invalidateQueries({ queryKey: ['biomarkers', userId] }),
          queryClient.invalidateQueries({ queryKey: ['labReports', userId] }),
          
          // Any other user-specific data
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              // Invalidate any query that includes this userId
              return query.queryKey.includes(userId)
            }
          })
        ])
  
        // Update dashboard key to force re-render of components that might not be using React Query
        setDashboardKey((prev) => prev + 1)
        
        // Show success toast
        toast({
          title: "Dashboard Refreshed",
          description: "All data has been updated successfully.",
          variant: "default",
        })
        
        console.log('Dashboard data refreshed successfully')
      } catch (error) {
        console.error('Error refreshing dashboard data:', error)
        
        // Show error toast
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh dashboard data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsRefreshing(false)
      }
    }, [userId, queryClient])

  const handleUserUpdated = useCallback(async (updatedUser: UserType) => {
    // Convert the updated user to the context format if needed
    setCurrentUser(updatedUser as any)
    setIsEditModalOpen(false)
    
    // Refresh dashboard data to reflect any changes
    await handleDataUpdate()
  }, [setCurrentUser, handleDataUpdate])



  const handleHealthModalClose = useCallback(async () => {
    setIsHealthModalOpen(false)
    // Refresh all dashboard data using React Query invalidation
    await handleDataUpdate()
  }, [handleDataUpdate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="text-lg">Loading user dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">User not found</h2>
          <Button 
            onClick={handleBackToManagement}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            Back to User Management
          </Button>
        </div>
      </div>
    )
  }

    return (
    <>
      <PageLayout
        title={`${currentUser.full_name}'s Dashboard`}
        subtitle="Health metrics and insights"
        icon={<Activity className="h-6 w-6 text-cyan-400" />}
        showBackButton={true}
        onBack={handleBackToManagement}
        showRefreshButton={true}
        onRefresh={handleDataUpdate}
        isRefreshing={isRefreshing}
        actions={
          <>
            <ActionButton
              onClick={() => setIsHealthModalOpen(true)}
              icon={Plus}
              variant="primary"
              size="sm"
              hideTextOnMobile={true}
            >
              Add Health Data
            </ActionButton>
            <ActionButton
              onClick={handleEditUser}
              icon={Settings}
              variant="secondary"
              size="sm"
              hideTextOnMobile={true}
            >
              Edit Profile
            </ActionButton>
          </>
        }
      >
        <Dashboard key={dashboardKey} />
      </PageLayout>

      <HealthDataModal
        isOpen={isHealthModalOpen}
        onClose={handleHealthModalClose}
        currentUser={currentUser as any}
      />

      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={currentUser as any}
        onUserUpdated={handleUserUpdated}
      />
    </>
  )
}

export default function UserDashboardPage() {
  return <UserDashboardContent />
} 