'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MobileNav } from './mobile-nav'
import { AlertsDropdown } from './alerts-dropdown'

interface HeaderProps {
  isAuthenticated?: boolean
  userName?: string | null
  userImage?: string | null
}

const NAV_LINKS = [
  { href: '/analyze', label: 'Analýza' },
  { href: '/trends', label: 'Trendy' },
  { href: '/competitors', label: 'Porovnání' },
]

export function Header({ isAuthenticated, userName }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Mobile hamburger */}
        {isAuthenticated && <MobileNav />}

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-primary text-xl font-bold">Orchideo</span>
        </Link>

        {/* Desktop nav - hidden on mobile */}
        {isAuthenticated && (
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'hover:text-foreground/80 transition-colors',
                  pathname?.startsWith(link.href) ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <AlertsDropdown />
              <span className="text-muted-foreground hidden text-sm sm:block">{userName}</span>
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
