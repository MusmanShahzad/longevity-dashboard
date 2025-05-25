import { UserProvider } from "@/app/contexts/user-context"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
} 