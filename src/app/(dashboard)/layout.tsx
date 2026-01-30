import { redirect } from 'next/navigation'
import { Header, Footer } from '@/components/layout'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header
        isAuthenticated={true}
        userName={session.user?.name}
        userImage={session.user?.image}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
