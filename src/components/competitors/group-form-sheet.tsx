'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Page {
  id: string
  name: string
}

interface GroupFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: Page[]
  onSuccess: () => void
}

export function GroupFormSheet({ open, onOpenChange, pages, onSuccess }: GroupFormSheetProps) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [primaryPageId, setPrimaryPageId] = React.useState<string>('')
  const [competitorIds, setCompetitorIds] = React.useState<string[]>([])
  const [isPending, setIsPending] = React.useState(false)

  // Reset form when sheet closes
  React.useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setPrimaryPageId('')
      setCompetitorIds([])
    }
  }, [open])

  // Filter out primary page from competitor options
  const availableCompetitors = React.useMemo(
    () => pages.filter((p) => p.id !== primaryPageId),
    [pages, primaryPageId]
  )

  // Remove primary from competitors if selected
  React.useEffect(() => {
    if (primaryPageId && competitorIds.includes(primaryPageId)) {
      setCompetitorIds((ids) => ids.filter((id) => id !== primaryPageId))
    }
  }, [primaryPageId, competitorIds])

  const handleCompetitorToggle = React.useCallback((pageId: string, checked: boolean) => {
    setCompetitorIds((prev) => {
      if (checked) {
        return prev.length < 10 ? [...prev, pageId] : prev
      }
      return prev.filter((id) => id !== pageId)
    })
  }, [])

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!name.trim()) {
        toast.error('Zadejte název skupiny')
        return
      }

      if (!primaryPageId) {
        toast.error('Vyberte primární stránku')
        return
      }

      if (competitorIds.length === 0) {
        toast.error('Vyberte alespoň jednoho konkurenta')
        return
      }

      setIsPending(true)

      try {
        const res = await fetch('/api/competitor-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            primaryPageId,
            competitorPageIds: competitorIds,
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Nepodařilo se vytvořit skupinu')
        }

        toast.success('Skupina vytvořena')
        onOpenChange(false)
        onSuccess()
      } catch (error) {
        console.error('[GroupFormSheet]', error)
        toast.error(error instanceof Error ? error.message : 'Nepodařilo se vytvořit skupinu')
      } finally {
        setIsPending(false)
      }
    },
    [name, description, primaryPageId, competitorIds, onOpenChange, onSuccess]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nová skupina konkurentů</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">
              Název <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Hlavní konkurenti"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">Popis</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Volitelný popis skupiny"
              maxLength={500}
            />
          </div>

          <div>
            <Label>
              Primární stránka <span className="text-destructive">*</span>
            </Label>
            <Select value={primaryPageId} onValueChange={setPrimaryPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte stránku" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-1 text-xs">
              Vaše stránka, kterou chcete porovnat s konkurenty
            </p>
          </div>

          <div>
            <Label>
              Konkurenti <span className="text-destructive">*</span>
              <span className="text-muted-foreground ml-1">({competitorIds.length}/10)</span>
            </Label>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {availableCompetitors.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {primaryPageId
                    ? 'Nejsou k dispozici další stránky'
                    : 'Nejdříve vyberte primární stránku'}
                </p>
              ) : (
                availableCompetitors.map((page) => (
                  <div key={page.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`competitor-${page.id}`}
                      checked={competitorIds.includes(page.id)}
                      onCheckedChange={(checked) =>
                        handleCompetitorToggle(page.id, checked === true)
                      }
                      disabled={!competitorIds.includes(page.id) && competitorIds.length >= 10}
                    />
                    <label
                      htmlFor={`competitor-${page.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {page.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <SheetFooter className="mt-8 flex gap-2 sm:justify-start">
            <LoadingButton type="submit" loading={isPending}>
              Vytvořit skupinu
            </LoadingButton>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
