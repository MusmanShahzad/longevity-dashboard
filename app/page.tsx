"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Plus } from "lucide-react"
import { PageLayout } from "@/components/layouts/page-layout"
import { ActionButton } from "@/components/ui/action-button"
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
    <>
      <PageLayout
        title="User Management"
        subtitle="Manage users and access their health dashboards"
        icon={<Users className="h-6 w-6 text-cyan-400" />}
        actions={
          <ActionButton
            onClick={() => setIsUserModalOpen(true)}
            icon={Plus}
            variant="primary"
            size="sm"
          >
            Create User
          </ActionButton>
        }
      >
        <UserManagement 
          onUserSelect={handleUserSelect} 
          onCreateUser={() => setIsUserModalOpen(true)}
        />
      </PageLayout>

      <UserCreationModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  )
}
