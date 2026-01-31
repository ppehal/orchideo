import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Zásady ochrany osobních údajů | Orchideo',
  description: 'Zásady ochrany osobních údajů aplikace Orchideo - FB Triggers',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na úvod
          </Link>
        </Button>

        <h1 className="mb-2 text-3xl font-bold">Zásady ochrany osobních údajů</h1>
        <p className="text-muted-foreground mb-8">Poslední aktualizace: 30. ledna 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Úvod</h2>
            <p className="text-muted-foreground">
              Vítejte v aplikaci Orchideo - FB Triggers. Vaše soukromí bereme vážně. Tyto zásady
              ochrany osobních údajů vysvětlují, jaké informace shromažďujeme, jak je používáme a
              jaká máte práva.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Jaké údaje shromažďujeme</h2>

            <h3 className="mt-4 mb-2 font-medium">2.1 Údaje z Facebooku</h3>
            <p className="text-muted-foreground mb-2">
              Když se přihlásíte přes Facebook, získáváme přístup k:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Základní profilové informace (jméno, e-mail, profilová fotka)</li>
              <li>Seznam Facebook stránek, které spravujete</li>
              <li>Insights data stránek (statistiky, reach, engagement)</li>
              <li>Příspěvky na stránkách a jejich metriky</li>
            </ul>

            <h3 className="mt-4 mb-2 font-medium">2.2 Údaje, které ukládáme</h3>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Vaše uživatelské ID a základní profilové informace</li>
              <li>Propojené Facebook stránky a jejich metadata</li>
              <li>Výsledky analýz a vygenerovaná doporučení</li>
              <li>Logy přístupů pro bezpečnostní účely</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Jak údaje používáme</h2>
            <p className="text-muted-foreground mb-2">Vaše údaje používáme výhradně k:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Provedení analýzy vaší Facebook stránky</li>
              <li>Generování personalizovaných doporučení</li>
              <li>Zobrazení historických výsledků analýz</li>
              <li>Zlepšování našich služeb a algoritmů</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Sdílení údajů</h2>
            <p className="text-muted-foreground mb-2">
              <strong className="text-foreground">
                Vaše údaje nikdy neprodáváme třetím stranám.
              </strong>
            </p>
            <p className="text-muted-foreground mb-2">Údaje můžeme sdílet pouze:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>S poskytovateli infrastruktury (hosting, databáze) pro provoz služby</li>
              <li>Pokud to vyžaduje zákon nebo soudní příkaz</li>
              <li>S vaším výslovným souhlasem</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Zabezpečení údajů</h2>
            <p className="text-muted-foreground mb-2">Chráníme vaše údaje pomocí:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Šifrovaného přenosu dat (HTTPS/TLS)</li>
              <li>Šifrování citlivých údajů v databázi</li>
              <li>Pravidelných bezpečnostních auditů</li>
              <li>Omezeného přístupu zaměstnanců k údajům</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Uchovávání údajů</h2>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Dokud máte aktivní účet v aplikaci</li>
              <li>Maximálně 90 dní po smazání účtu pro účely zálohování</li>
              <li>Anonymizované statistiky můžeme uchovávat déle</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Vaše práva (GDPR)</h2>
            <p className="text-muted-foreground mb-2">Máte právo na:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">Přístup</strong> – získat kopii svých údajů
              </li>
              <li>
                <strong className="text-foreground">Opravu</strong> – požádat o opravu nepřesných
                údajů
              </li>
              <li>
                <strong className="text-foreground">Výmaz</strong> – požádat o smazání svých údajů
              </li>
              <li>
                <strong className="text-foreground">Přenositelnost</strong> – získat údaje ve
                strojově čitelném formátu
              </li>
              <li>
                <strong className="text-foreground">Námitku</strong> – odmítnout zpracování pro
                určité účely
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Pro uplatnění těchto práv nás kontaktujte na{' '}
              <a href="mailto:privacy@orchideo.cz" className="text-primary hover:underline">
                privacy@orchideo.cz
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Cookies</h2>
            <p className="text-muted-foreground mb-2">Používáme pouze nezbytné cookies pro:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>Udržení přihlášení (session cookies)</li>
              <li>Bezpečnostní ochranu (CSRF tokens)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Nepoužíváme sledovací ani reklamní cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Děti</h2>
            <p className="text-muted-foreground">
              Naše služba není určena osobám mladším 16 let. Vědomě neshromažďujeme údaje od dětí.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Změny zásad</h2>
            <p className="text-muted-foreground">
              O významných změnách těchto zásad vás budeme informovat e-mailem nebo oznámením v
              aplikaci minimálně 30 dní předem.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Kontakt</h2>
            <p className="text-muted-foreground">
              Máte-li dotazy ohledně ochrany osobních údajů, kontaktujte nás na{' '}
              <a href="mailto:privacy@orchideo.cz" className="text-primary hover:underline">
                privacy@orchideo.cz
              </a>
              .
            </p>
          </section>

          <hr className="border-border" />

          <p className="text-muted-foreground text-sm">
            Tyto zásady jsou v souladu s Nařízením GDPR (EU) 2016/679 a zákonem č. 110/2019 Sb.
          </p>
        </div>
      </div>
    </div>
  )
}
