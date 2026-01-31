'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const NAV_LINKS = [
  { href: '/analyze', label: 'Analýza' },
  { href: '/trends', label: 'Trendy' },
  { href: '/competitors', label: 'Porovnání' },
  { href: '/alerts', label: 'Upozornění' },
]

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const handleLinkClick = React.useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Otevřít menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle className="text-primary text-left text-xl">Orchideo</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 pt-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                pathname?.startsWith(link.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
