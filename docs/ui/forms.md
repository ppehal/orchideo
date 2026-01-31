# Forms

> Form patterns and validation for Orchideo.

---

## Overview

Forms use react-hook-form with Zod validation and shadcn/ui components.

---

## Form Structure

### Basic Form Pattern

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import { toast } from 'sonner'

const formSchema = z.object({
  email: z.string().email('Neplatny email'),
  name: z.string().min(1, 'Jmeno je povinne'),
})

type FormValues = z.infer<typeof formSchema>

export function MyForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(data: FormValues) {
    const result = await submitAction(data)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Ulozeno')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        {/* Name field */}
        <div>
          <Label htmlFor="name">
            Jmeno <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-destructive mt-1 text-sm">{errors.name.message}</p>}
        </div>

        {/* Email field */}
        <div>
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-destructive mt-1 text-sm">{errors.email.message}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-2">
        <LoadingButton type="submit" loading={isSubmitting}>
          Ulozit
        </LoadingButton>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Zrusit
        </Button>
      </div>
    </form>
  )
}
```

---

## Required Fields

Always mark required fields with red asterisk:

```tsx
<Label htmlFor="field">
  Nazev pole <span className="text-destructive">*</span>
</Label>
```

---

## Validation

### Zod Schema

```typescript
import { z } from 'zod'

const schema = z.object({
  // Required string
  name: z.string().min(1, 'Nazev je povinny'),

  // Email
  email: z.string().email('Neplatny email'),

  // Optional with default
  industryCode: z.string().optional().default('DEFAULT'),

  // Number
  amount: z.number().min(0, 'Castka musi byt kladna'),

  // Enum
  status: z.enum(['ACTIVE', 'INACTIVE']),

  // Date
  date: z.date({ required_error: 'Datum je povinne' }),

  // URL
  url: z.string().url('Neplatna URL'),
})
```

### Server-Side Validation

```typescript
// src/lib/validators/email.ts
import { z } from 'zod'

export const sendReportEmailSchema = z.object({
  email: z.string().email('Neplatny email'),
  analysisToken: z.string().min(1, 'Token je povinny'),
})

export type SendReportEmailInput = z.infer<typeof sendReportEmailSchema>
```

Usage in API route:

```typescript
const parseResult = sendReportEmailSchema.safeParse(body)
if (!parseResult.success) {
  return NextResponse.json(
    { error: 'Neplatny vstup', details: parseResult.error.flatten() },
    { status: 400 }
  )
}
```

---

## Error Display

### Field-Level Errors

```tsx
{
  errors.fieldName && <p className="text-destructive mt-1 text-sm">{errors.fieldName.message}</p>
}
```

### Form-Level Errors (Toast)

```tsx
async function onSubmit(data: FormValues) {
  const result = await action(data)

  if (!result.success) {
    toast.error(result.error)
    return
  }

  toast.success('Uspech')
}
```

---

## Sheet Forms

Forms in Sheet (slide-over panel):

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Nazev formulare</SheetTitle>
      <SheetDescription>Popis formulare</SheetDescription>
    </SheetHeader>

    <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
      <div className="space-y-4">{/* Form fields */}</div>

      <SheetFooter className="mt-8 flex gap-2 sm:justify-start">
        <LoadingButton type="submit" loading={isSubmitting}>
          Ulozit
        </LoadingButton>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Zrusit
        </Button>
      </SheetFooter>
    </form>
  </SheetContent>
</Sheet>
```

**Footer pattern:**

- Submit button first
- Cancel button second
- Classes: `mt-8 flex gap-2 sm:justify-start`

---

## Loading States

### Submit Button

```tsx
<LoadingButton type="submit" loading={isSubmitting}>
  Ulozit
</LoadingButton>
```

### Long Operations

```tsx
async function onSubmit(data: FormValues) {
  toast.loading('Zpracovavam...', {
    description: 'Muze to trvat az minutu',
  })

  const result = await longRunningAction(data)

  toast.dismiss()

  if (result.success) {
    toast.success('Hotovo')
  } else {
    toast.error(result.error)
  }
}
```

---

## Select Fields

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Controller } from 'react-hook-form'

;<Controller
  control={control}
  name="industryCode"
  render={({ field }) => (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Vyberte odvetvi" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DEFAULT">Obecne</SelectItem>
        <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
        <SelectItem value="SAAS">SaaS</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

---

## Checkbox Fields

```tsx
import { Checkbox } from '@/components/ui/checkbox'
import { Controller } from 'react-hook-form'

;<Controller
  control={control}
  name="agree"
  render={({ field }) => (
    <div className="flex items-center space-x-2">
      <Checkbox id="agree" checked={field.value} onCheckedChange={field.onChange} />
      <Label htmlFor="agree">Souhlasim s podminkami</Label>
    </div>
  )}
/>
```

---

## Form with Server Action

```tsx
'use client'

import { useActionState } from 'react'
import { createItem } from '@/lib/actions/items'

const initialState = { success: false, error: null }

export function CreateForm() {
  const [state, formAction, isPending] = useActionState(createItem, initialState)

  return (
    <form action={formAction}>
      <Input name="name" required />

      {state.error && <p className="text-destructive">{state.error}</p>}

      <LoadingButton type="submit" loading={isPending}>
        Vytvorit
      </LoadingButton>
    </form>
  )
}
```

---

## Anti-patterns

| Don't                     | Do Instead                 |
| ------------------------- | -------------------------- |
| `<input required>` only   | Add Zod validation         |
| Alert for errors          | Use toast or inline errors |
| Disable submit always     | Use loading state          |
| Hard-coded error messages | Use Zod messages           |
| Multiple form libs        | Stick with react-hook-form |
| Inline validation logic   | Use Zod schema             |

---

## Checklist

- [ ] Zod schema defined
- [ ] Required fields marked with red asterisk
- [ ] Error messages in Czech
- [ ] LoadingButton for submit
- [ ] Toast for success/error feedback
- [ ] Proper field IDs and labels
- [ ] Form reset on cancel
- [ ] Server-side validation matches client
