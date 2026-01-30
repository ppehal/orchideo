'use client'

import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { toast } from 'sonner'
import { Check, Link } from 'lucide-react'
import { useCallback } from 'react'

interface CopyLinkButtonProps {
  url?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  showIcon?: boolean
  className?: string
}

export function CopyLinkButton({
  url,
  variant = 'outline',
  size = 'default',
  showIcon = true,
  className,
}: CopyLinkButtonProps) {
  const { copied, copy } = useCopyToClipboard()

  const handleCopy = useCallback(async () => {
    const linkToCopy = url ?? window.location.href

    const success = await copy(linkToCopy)

    if (success) {
      toast.success('Odkaz zkopírován', {
        description: 'Odkaz na report byl zkopírován do schránky',
      })
    } else {
      toast.error('Nepodařilo se zkopírovat', {
        description: 'Zkuste to prosím znovu',
      })
    }
  }, [url, copy])

  return (
    <Button variant={variant} size={size} onClick={handleCopy} className={className}>
      {showIcon &&
        (copied ? <Check className="mr-2 h-4 w-4" /> : <Link className="mr-2 h-4 w-4" />)}
      {copied ? 'Zkopírováno!' : 'Zkopírovat odkaz'}
    </Button>
  )
}
