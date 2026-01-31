import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Obchodní podmínky | Orchideo',
  description: 'Obchodní podmínky aplikace Orchideo - FB Triggers',
}

export default function TermsPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na úvod
          </Link>
        </Button>

        <h1 className="mb-2 text-3xl font-bold">Obchodní podmínky</h1>
        <p className="text-muted-foreground mb-8">Poslední aktualizace: 30. ledna 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Úvodní ustanovení</h2>
            <p className="text-muted-foreground mb-2">
              Tyto obchodní podmínky upravují používání aplikace Orchideo - FB Triggers provozované
              společností [Název společnosti].
            </p>
            <p className="text-muted-foreground">
              Používáním aplikace souhlasíte s těmito podmínkami.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Popis služby</h2>
            <p className="text-muted-foreground mb-2">Orchideo - FB Triggers je nástroj pro:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Analýzu Facebook stránek a jejich výkonu</li>
              <li>Generování doporučení pro zlepšení engagementu</li>
              <li>Sledování klíčových metrik a trendů</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Registrace a účet</h2>

            <h3 className="mt-4 mb-2 font-medium">3.1 Vytvoření účtu</h3>
            <p className="text-muted-foreground">
              Pro používání aplikace se musíte přihlásit pomocí svého Facebook účtu.
            </p>

            <h3 className="mt-4 mb-2 font-medium">3.2 Požadavky</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Musíte být starší 16 let</li>
              <li>Musíte mít platný Facebook účet</li>
              <li>Musíte být oprávněným správcem Facebook stránek, které analyzujete</li>
            </ul>

            <h3 className="mt-4 mb-2 font-medium">3.3 Odpovědnost za účet</h3>
            <p className="text-muted-foreground">
              Jste odpovědní za veškerou aktivitu pod svým účtem. Neposkytujte své přihlašovací
              údaje třetím osobám.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Používání služby</h2>

            <h3 className="mt-4 mb-2 font-medium">4.1 Povolené použití</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Analýza stránek, které oprávněně spravujete</li>
              <li>Získávání doporučení pro zlepšení vašeho obsahu</li>
              <li>Legální marketingové účely</li>
            </ul>

            <h3 className="mt-4 mb-2 font-medium">4.2 Zakázané použití</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Analyzovat stránky bez oprávnění jejich správce</li>
              <li>Automatizovaně scrapeovat nebo extrahovat data</li>
              <li>Obcházet bezpečnostní opatření aplikace</li>
              <li>Používat službu k nelegálním účelům</li>
              <li>Přetěžovat infrastrukturu nadměrným počtem požadavků</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Facebook Platform Policy</h2>
            <p className="text-muted-foreground">
              Používáním této aplikace souhlasíte také s{' '}
              <a
                href="https://developers.facebook.com/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Facebook Platform Policy
              </a>
              . Aplikace využívá Facebook API v souladu s jejich podmínkami.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Cena a platby</h2>
            <p className="text-muted-foreground mb-2">
              Základní analýza je poskytována <strong className="text-foreground">zdarma</strong>.
            </p>
            <p className="text-muted-foreground">
              Případné prémiové funkce budou jasně označeny s uvedením ceny před zakoupením.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Dostupnost služby</h2>
            <p className="text-muted-foreground mb-2">
              Snažíme se zajistit nepřetržitou dostupnost, ale nezaručujeme 100% dostupnost. Služba
              může být dočasně nedostupná z důvodu:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Plánované údržby (oznámíme předem)</li>
              <li>Technických problémů</li>
              <li>Změn v Facebook API</li>
              <li>Vyšší moci</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Duševní vlastnictví</h2>

            <h3 className="mt-4 mb-2 font-medium">8.1 Naše vlastnictví</h3>
            <p className="text-muted-foreground">
              Aplikace, její design, algoritmy a kód jsou naším duševním vlastnictvím chráněným
              autorským právem.
            </p>

            <h3 className="mt-4 mb-2 font-medium">8.2 Vaše data</h3>
            <p className="text-muted-foreground">
              Zůstáváte vlastníkem všech dat, která do aplikace nahrajete. Udělujete nám licenci k
              jejich zpracování za účelem poskytování služby.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Omezení odpovědnosti</h2>
            <p className="text-muted-foreground mb-2">
              Služba je poskytována &quot;tak jak je&quot; (as-is). V maximálním rozsahu povoleném
              zákonem:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Nezaručujeme přesnost ani úplnost analýz</li>
              <li>Neodpovídáme za obchodní rozhodnutí učiněná na základě našich doporučení</li>
              <li>Neodpovídáme za škody způsobené výpadkem služby nebo ztrátou dat</li>
              <li>Naše odpovědnost je omezena na částku zaplacenou za službu</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Ukončení</h2>

            <h3 className="mt-4 mb-2 font-medium">10.1 Ukončení z vaší strany</h3>
            <p className="text-muted-foreground">
              Můžete kdykoli přestat službu používat a požádat o smazání účtu na{' '}
              <a href="mailto:support@orchideo.cz" className="text-primary hover:underline">
                support@orchideo.cz
              </a>
              .
            </p>

            <h3 className="mt-4 mb-2 font-medium">10.2 Ukončení z naší strany</h3>
            <p className="text-muted-foreground mb-2">
              Můžeme váš účet pozastavit nebo ukončit, pokud:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Porušíte tyto podmínky</li>
              <li>Porušíte Facebook Platform Policy</li>
              <li>Službu používáte podvodným způsobem</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Změny podmínek</h2>
            <p className="text-muted-foreground">
              Tyto podmínky můžeme měnit. O významných změnách vás budeme informovat e-mailem nebo
              oznámením v aplikaci minimálně 14 dní předem.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Rozhodné právo</h2>
            <p className="text-muted-foreground">
              Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny u
              příslušných soudů České republiky.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">13. Kontakt</h2>
            <p className="text-muted-foreground">
              Máte-li dotazy k těmto podmínkám, kontaktujte nás na{' '}
              <a href="mailto:support@orchideo.cz" className="text-primary hover:underline">
                support@orchideo.cz
              </a>
              .
            </p>
          </section>

          <hr className="border-border" />

          <p className="text-muted-foreground text-sm">
            Používáním aplikace Orchideo souhlasíte s těmito obchodními podmínkami.
          </p>
        </div>
      </div>
    </div>
  )
}
