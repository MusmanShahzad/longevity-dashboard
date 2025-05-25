"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserManagement } from "@/components/organisms/user-management"
import { UserCreationModal } from "@/components/organisms/user-creation-modal"
import type { User as UserType } from "@/lib/supabase"

export default function Home() {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const router = useRouter()

  const handleUserCreated = (user: UserType) => {
    // React Query will automatically update the cache
    setIsUserModalOpen(false)
  }

  const handleUserSelect = (user: UserType) => {
    // Navigate to the user's dashboard page
    router.push(`/user/${user.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <UserManagement 
        onUserSelect={handleUserSelect} 
        onCreateUser={() => setIsUserModalOpen(true)}
      />

      <UserCreationModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
