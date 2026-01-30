'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getIndustryOptions, type IndustryCode } from '@/lib/constants/fb-category-map'

interface IndustrySelectorProps {
  value: IndustryCode
  onChange: (value: IndustryCode) => void
  suggestedIndustry?: IndustryCode
  disabled?: boolean
}

const industryOptions = getIndustryOptions()

export function IndustrySelector({
  value,
  onChange,
  suggestedIndustry,
  disabled = false,
}: IndustrySelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="industry" className="text-sm leading-none font-medium">
        Obor podnikání
        {suggestedIndustry && suggestedIndustry !== 'DEFAULT' && value !== suggestedIndustry && (
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            (Navrženo: {industryOptions.find((o) => o.value === suggestedIndustry)?.label})
          </span>
        )}
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as IndustryCode)} disabled={disabled}>
        <SelectTrigger id="industry" className="w-full">
          <SelectValue placeholder="Vyberte obor" />
        </SelectTrigger>
        <SelectContent>
          {industryOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.value === suggestedIndustry && option.value !== 'DEFAULT' && (
                <span className="text-muted-foreground ml-2">(navrženo)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">
        Obor se použije pro porovnání s oborovým benchmarkem
      </p>
    </div>
  )
}
