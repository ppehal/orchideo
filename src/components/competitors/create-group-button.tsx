'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GroupFormSheet } from './group-form-sheet'

interface Page {
  id: string
  name: string
  picture_url: string | null
}

interface CreateGroupButtonProps {
  pages: Page[]
}

export function CreateGroupButton({ pages }: CreateGroupButtonProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const handleSuccess = React.useCallback(() => {
    // Sheet will close automatically via onOpenChange
    // Server Action will trigger revalidation
  }, [])

  return (
    <>
      <Button onClick={() => setSheetOpen(true)} size="lg">
        <Plus className="mr-2 h-4 w-4" />
        Nová skupina
      </Button>

      <GroupFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        pages={pages}
        onSuccess={handleSuccess}
      />
    </>
  )
}
