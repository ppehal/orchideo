'use client'

import * as React from 'react'
import Link from 'next/link'
import { MoreHorizontal, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteCompetitorGroupAction } from '@/lib/actions/competitor-groups'

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

interface GroupCardProps {
  group: CompetitorGroup
}

export function GroupCard({ group }: GroupCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true)
    try {
      const result = await deleteCompetitorGroupAction(group.id)

      if (result.success) {
        toast.success('Skupina smazána')
        setDeleteOpen(false)
        // Server Action triggers revalidation automatically
      } else {
        toast.error(result.error || 'Nepodařilo se smazat skupinu')
        setIsDeleting(false)
      }
    } catch {
      toast.error('Nepodařilo se smazat skupinu')
      setIsDeleting(false)
    }
  }, [group.id])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{group.name}</CardTitle>
            {group.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{group.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Akce</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/competitors/${group.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Zobrazit porovnání
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Smazat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Primární stránka
              </p>
              <p className="text-sm font-medium">{group.primaryPage.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                Konkurenti ({group.competitors.length})
              </p>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {group.competitors.map((c) => c.name).join(', ')}
              </p>
            </div>
            {group.comparisonsCount > 0 && (
              <p className="text-muted-foreground text-xs">
                {group.comparisonsCount} uložených porovnání
              </p>
            )}
          </div>
          <div className="mt-4">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/competitors/${group.id}`}>Zobrazit porovnání</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Smazat skupinu konkurentů?"
        description={
          group.comparisonsCount > 0
            ? `Skupina obsahuje ${group.comparisonsCount} uložených porovnání. ` +
              'Smazáním přijdete o všechna historická data. Tato akce je nevratná.'
            : 'Opravdu chcete smazat tuto skupinu? Tato akce je nevratná.'
        }
        variant="destructive"
        confirmText="Smazat skupinu"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </>
  )
}
