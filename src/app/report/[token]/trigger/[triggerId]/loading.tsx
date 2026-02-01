import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function TriggerDetailLoading() {
  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Back button skeleton */}
        <Skeleton className="h-9 w-32" />

        {/* Header skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-10 w-16 rounded-md" />
            </div>
          </CardHeader>
        </Card>

        {/* Input parameters skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intro text skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        {/* Categories skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
