import type { LucideIcon } from 'lucide-react'
import { Mail, User, FileText, BarChart3, MessageSquare, TrendingUp, Building2 } from 'lucide-react'

export interface FbPermissionDefinition {
  id: string
  icon: LucideIcon
  title: string
  description: string
  required: boolean
}

/**
 * Facebook permission definitions for login disclosure
 * Single Source of Truth for permission display
 */
export const FB_PERMISSIONS: FbPermissionDefinition[] = [
  {
    id: 'email',
    icon: Mail,
    title: 'E-mail',
    description: 'Pro identifikaci vašeho účtu',
    required: true,
  },
  {
    id: 'public_profile',
    icon: User,
    title: 'Veřejný profil',
    description: 'Zobrazení jména a fotky v aplikaci',
    required: true,
  },
  {
    id: 'pages_show_list',
    icon: FileText,
    title: 'Seznam stránek',
    description: 'Zobrazení stránek pro výběr k analýze',
    required: true,
  },
  {
    id: 'pages_read_engagement',
    icon: BarChart3,
    title: 'Metriky zapojení',
    description: 'Čtení lajků, komentářů a sdílení',
    required: true,
  },
  {
    id: 'pages_read_user_content',
    icon: MessageSquare,
    title: 'Obsah příspěvků',
    description: 'Čtení textů pro obsahovou analýzu',
    required: true,
  },
  {
    id: 'read_insights',
    icon: TrendingUp,
    title: 'Statistiky stránky',
    description: 'Přístup k analytickým datům',
    required: true,
  },
  {
    id: 'business_management',
    icon: Building2,
    title: 'Business Portfolio',
    description: 'Pro stránky spravované přes Business Manager',
    required: true,
  },
]

/**
 * List of things we DON'T do with user data
 * Displayed in green "trust building" section
 */
export const FB_PERMISSIONS_DONT_LIST: string[] = [
  'Nikdy nepřispíváme na vaši stránku',
  'Neměníme nastavení vaší stránky',
  'Nesdílíme vaše data s třetími stranami',
  'Neukládáme přístupové tokeny dlouhodobě',
  'Data používáme pouze pro analýzu',
]
