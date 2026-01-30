import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-border/40 border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-muted-foreground text-center text-sm leading-loose md:text-left">
          © {currentYear}{' '}
          <Link href="/" className="font-medium underline underline-offset-4">
            Orchideo
          </Link>
          . Všechna práva vyhrazena.
        </p>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Zásady ochrany osobních údajů
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Podmínky použití
          </Link>
        </nav>
      </div>
    </footer>
  )
}
