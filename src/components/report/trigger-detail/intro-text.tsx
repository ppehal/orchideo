import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

interface IntroTextProps {
  text: string
}

export function IntroText({ text }: IntroTextProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-muted-foreground h-4 w-4" />
          <CardTitle className="text-base font-medium">Jak to funguje?</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  )
}
