import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Analyzovat stránku',
}

export default function AnalyzePage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Analyzovat Facebook stránku</CardTitle>
            <CardDescription>
              Zadejte URL vaší Facebook stránky nebo se přihlaste přes Facebook a vyberte stránku ze
              seznamu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Tato sekce bude implementována ve Fázi 1 (Facebook OAuth & Page Selection).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
