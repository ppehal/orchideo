import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="container py-12">
      <section className="mx-auto flex max-w-[980px] flex-col items-center gap-4 py-8 md:py-12 lg:py-24">
        <h1 className="text-center text-3xl leading-tight font-bold tracking-tighter md:text-5xl lg:text-6xl">
          Analýza vaší Facebook stránky
          <br />
          <span className="text-primary">za pár minut</span>
        </h1>
        <p className="text-muted-foreground max-w-[700px] text-center text-lg md:text-xl">
          Zjistěte, jak si vaše firemní stránka vede. Získejte konkrétní doporučení, jak zlepšit
          dosah a engagement vašich příspěvků.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Začít analýzu zdarma</Link>
          </Button>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Jak to funguje?</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                  1
                </span>
                Připojte stránku
              </CardTitle>
              <CardDescription>
                Přihlaste se přes Facebook a vyberte stránku, kterou chcete analyzovat
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                  2
                </span>
                Automatická analýza
              </CardTitle>
              <CardDescription>
                Náš systém analyzuje 27 klíčových metrik a vytvoří komplexní report
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                  3
                </span>
                Získejte doporučení
              </CardTitle>
              <CardDescription>
                Dostanete skóre 0-100 a TOP 5 konkrétních kroků ke zlepšení
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="py-12">
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <h2 className="text-2xl font-bold">Připraveni začít?</h2>
            <p className="text-muted-foreground max-w-[600px]">
              Analýza je kompletně zdarma. Stačí se přihlásit a vybrat stránku.
            </p>
            <Button asChild size="lg">
              <Link href="/login">Analyzovat moji stránku</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
