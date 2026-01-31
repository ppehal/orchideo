'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { GroupCard } from './group-card'
import { GroupFormSheet } from './group-form-sheet'

interface Page {
  id: string
  name: string
  picture_url: string | null
}

interface CompetitorGroup {
  id: string
  name: string
  description: string | null
  primaryPage: Page
  competitors: Page[]
  comparisonsCount: number
}

interface GroupListProps {
  pages: Page[]
}

export function GroupList({ pages }: GroupListProps) {
  const [groups, setGroups] = React.useState<CompetitorGroup[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const fetchGroups = React.useCallback(async () => {
    try {
      const res = await fetch('/api/competitor-groups', {
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch groups')
      }

      const data = await res.json()
      setGroups(data.groups)
    } catch (error) {
      console.error('[GroupList] fetch failed', error)
      toast.error('Nepodařilo se načíst skupiny')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleDelete = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/competitor-groups/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        toast.error('Nepodařilo se smazat skupinu')
        return
      }

      setGroups((prev) => prev.filter((g) => g.id !== id))
      toast.success('Skupina byla smazána')
    } catch (error) {
      console.error('[GroupList] delete failed', error)
      toast.error('Nepodařilo se smazat skupinu')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  if (pages.length < 2) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Nedostatek stránek"
        description="Pro vytvoření skupiny konkurentů potřebujete alespoň 2 analyzované stránky."
        action={
          <Button asChild>
            <Link href="/analyze">Analyzovat stránku</Link>
          </Button>
        }
      />
    )
  }

  if (groups.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Žádné skupiny konkurentů"
          description="Vytvořte skupinu pro porovnání vašich stránek s konkurencí."
          action={<Button onClick={() => setSheetOpen(true)}>Vytvořit skupinu</Button>}
        />
        <GroupFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          pages={pages}
          onSuccess={fetchGroups}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nová skupina
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} onDelete={handleDelete} />
        ))}
      </div>

      <GroupFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        pages={pages}
        onSuccess={fetchGroups}
      />
    </div>
  )
}
