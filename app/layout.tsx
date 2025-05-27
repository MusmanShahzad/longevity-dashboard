import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { SecurityProvider, SecurityStatus } from '@/app/contexts/security-context'
import { Header } from '@/components/organisms/header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Longevity Dashboard',
  description: 'Track your health and longevity metrics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <SecurityProvider sessionTimeoutMinutes={30} warningTimeMinutes={5}>
            <QueryProvider>
              <div className="p-3 sm:p-4 md:p-6 lg:p-4 xl:p-8">
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                  <Header />
                  <div className="min-h-[calc(100vh-200px)]">
                    {children}
                  </div>
                </div>
              </div>
            </QueryProvider>
            <SecurityStatus />
          </SecurityProvider>
        </div>
      </body>
    </html>
  )
}
