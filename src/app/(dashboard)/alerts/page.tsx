import { AlertsClient } from './client'

export const metadata = {
  title: 'Upozornění',
}

export default function AlertsPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upozornění</h1>
          <p className="text-muted-foreground mt-2">
            Sledujte významné změny ve výkonu vašich stránek.
          </p>
        </div>

        <AlertsClient />
      </div>
    </div>
  )
}
