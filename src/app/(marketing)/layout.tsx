import { Header, Footer } from '@/components/layout'
import { auth } from '@/lib/auth'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header
        isAuthenticated={!!session}
        userName={session?.user?.name}
        userImage={session?.user?.image}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
