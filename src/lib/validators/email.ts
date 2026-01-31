import { z } from 'zod'

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email je povinný')
  .max(254, 'Email je příliš dlouhý')
  .email('Neplatný formát emailu')
  .toLowerCase()
  .trim()

/**
 * Send report email request schema
 */
export const sendReportEmailSchema = z.object({
  email: emailSchema,
  analysisToken: z.string().min(1, 'Token analýzy je povinný').max(100, 'Token je příliš dlouhý'),
})

export type SendReportEmailInput = z.infer<typeof sendReportEmailSchema>

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}
