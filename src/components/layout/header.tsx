'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface HeaderProps {
  isAuthenticated?: boolean
  userName?: string | null
  userImage?: string | null
}

export function Header({ isAuthenticated, userName }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-primary text-xl font-bold">🌸 Orchideo</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className={cn(
                'hover:text-foreground/80 transition-colors',
                pathname === '/' ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              Domů
            </Link>
            {isAuthenticated && (
              <Link
                href="/analyze"
                className={cn(
                  'hover:text-foreground/80 transition-colors',
                  pathname?.startsWith('/analyze') ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                Analýza
              </Link>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">{userName}</span>
              <Link
                href="/api/auth/signout"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Odhlásit
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors"
            >
              Přihlásit se
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
