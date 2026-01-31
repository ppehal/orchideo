# Data Tables

> Table patterns for Orchideo (minimal usage).

---

## Overview

Orchideo has limited table usage. Most data is displayed in cards and lists.

---

## Simple Tables

For static data display:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nazev</TableHead>
      <TableHead>Hodnota</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.value}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Empty State

```tsx
{
  items.length === 0 ? (
    <EmptyState title="Zadne polozky" description="Zatim zde nic neni" />
  ) : (
    <Table>...</Table>
  )
}
```

---

## Loading State

```tsx
{
  isLoading ? <LoadingSpinnerCentered /> : <Table>...</Table>
}
```

---

## When to Use Tables

| Use Case         | Component    |
| ---------------- | ------------ |
| Trigger results  | Cards        |
| Analysis history | Cards/List   |
| Page selection   | Cards        |
| Reference data   | Simple Table |

For complex data tables with sorting, filtering, and pagination, consider using [TanStack Table](https://tanstack.com/table) if needed in the future.
