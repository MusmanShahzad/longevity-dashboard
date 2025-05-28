"use client"

import { useState } from "react"
import { Users, Plus, Search, Calendar, MapPin, User } from "lucide-react"
import { GlassCard } from "@/components/atoms/glass-card"
import { Button } from "@/components/ui/button"
import { useUsers } from "@/lib/hooks/use-users"
import type { User as UserType } from "@/lib/supabase"
import { calculateAge } from "@/lib/supabase"

interface UserManagementProps {
  onUserSelect: (user: UserType) => void
  onCreateUser: () => void
}

const ErrorState = ({ error, onCreateUser }: { error: string, onCreateUser: () => void }) => (
  <div className="min-h-screen p-4 md:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-red-300">Error loading users</p>
            </div>
          </div>
          <Button
            onClick={onCreateUser}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>
      </GlassCard>
      <GlassCard className="p-12">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Users</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            Try Again
          </Button>
        </div>
      </GlassCard>
    </div>
  </div>
)

const EmptyState = ({ onCreateUser }: { onCreateUser: () => void }) => (
  <GlassCard className="p-12">
    <div className="text-center">
      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">No Users Yet</h3>
      <p className="text-gray-400 mb-6">Get started by creating your first user profile</p>
      <Button
        onClick={onCreateUser}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create First User
      </Button>
    </div>
  </GlassCard>
)

const NoSearchResults = () => (
  <GlassCard className="p-12">
    <div className="text-center">
      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
      <p className="text-gray-400">Try adjusting your search criteria</p>
    </div>
  </GlassCard>
)

const SearchBar = ({ 
  searchTerm, 
  onSearchChange 
}: { 
  searchTerm: string
  onSearchChange: (value: string) => void 
}) => (
  <GlassCard className="p-4">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search users by name, email, or location..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
      />
    </div>
  </GlassCard>
)

const StatsCard = ({ count }: { count: number }) => (
  <GlassCard className="p-4">
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{count}</div>
      <div className="text-sm text-gray-300">Total Users</div>
    </div>
  </GlassCard>
)

const UserCard = ({ user, onSelect }: { user: UserType, onSelect: () => void }) => {
  const age = user.date_of_birth ? calculateAge(user.date_of_birth) : null

  return (
    <div onClick={onSelect} className="cursor-pointer group">
      <GlassCard className="p-6 hover:bg-white/20 transition-all duration-300">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {user.full_name}
            </h3>
            {user.email && <p className="text-sm text-gray-400 truncate">{user.email}</p>}

            <div className="mt-3 space-y-2">
              {age && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span className="text-gray-300">{age} years old</span>
                </div>
              )}

              {user.location && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span className="text-gray-300 truncate">{user.location}</span>
                </div>
              )}

              {user.sex && (
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-cyan-400" />
                  <span className="text-gray-300 capitalize">{user.sex}</span>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <Button
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 group-hover:shadow-lg transition-all"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            View Dashboard
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}


export function UserManagement({ onUserSelect, onCreateUser }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // React Query hook
  const { data: users = [], isLoading, error } = useUsers()

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Show error state
  if (error) {
    return <ErrorState error={error.message} onCreateUser={onCreateUser} />
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>
          <StatsCard count={users.length} />
        </div>

        {/* Users Grid */}
        {users.length === 0 ? (
          <EmptyState onCreateUser={onCreateUser} />
        ) : filteredUsers.length === 0 ? (
          <NoSearchResults />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} onSelect={() => onUserSelect(user)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
