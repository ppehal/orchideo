import { describe, it, expect } from 'vitest'
import { classifyContent, analyzeContentMix, hasCallToAction } from '@/lib/utils/text-analysis'

describe('classifyContent', () => {
  describe('SALES content detection', () => {
    it('detects Czech sales keywords', () => {
      expect(classifyContent('Sleva 50% pouze dnes!')).toBe('SALES')
      expect(classifyContent('Kupte nyní za akční cenu')).toBe('SALES')
      expect(classifyContent('Výprodej skladových zásob')).toBe('SALES')
      expect(classifyContent('Doprava zdarma od 500 Kč')).toBe('SALES')
    })

    it('detects English sales keywords', () => {
      expect(classifyContent('Buy now and save 20%!')).toBe('SALES')
      expect(classifyContent('Limited offer - free shipping')).toBe('SALES')
      expect(classifyContent('Shop now for the best deals')).toBe('SALES')
    })

    it('detects sales with percentage symbol', () => {
      expect(classifyContent('Speciální akce -30%')).toBe('SALES')
      expect(classifyContent('Save 15% today')).toBe('SALES')
    })

    it('detects single sales keyword as SALES', () => {
      expect(classifyContent('Velký výprodej začíná')).toBe('SALES')
      expect(classifyContent('Check out our sale')).toBe('SALES')
    })

    it('detects promo codes and coupons', () => {
      expect(classifyContent('Použijte promo kód LETO2024')).toBe('SALES')
      expect(classifyContent('Slevový kód: NOVAK20')).toBe('SALES')
    })
  })

  describe('BRAND content detection', () => {
    it('detects Czech brand keywords', () => {
      expect(classifyContent('Náš tým oslavuje 10. výročí firmy')).toBe('BRAND')
      expect(classifyContent('Zákulisí naší výroby - podívejte se')).toBe('BRAND')
      expect(classifyContent('Děkujeme za důvěru, milí zákazníci')).toBe('BRAND')
    })

    it('detects English brand keywords', () => {
      expect(classifyContent('Meet the team behind our success')).toBe('BRAND')
      expect(classifyContent('Celebrating our company anniversary')).toBe('BRAND')
      expect(classifyContent('Behind the scenes at our office')).toBe('BRAND')
    })

    it('detects company story content', () => {
      expect(classifyContent('Náš příběh začal před 20 lety')).toBe('BRAND')
      expect(classifyContent('Our story and mission')).toBe('BRAND')
    })

    it('detects team-related content', () => {
      expect(classifyContent('Seznamte se s našimi kolegy')).toBe('BRAND')
      expect(classifyContent('New team member announcement')).toBe('BRAND')
    })
  })

  describe('ENGAGEMENT content detection', () => {
    it('returns ENGAGEMENT for empty or null text', () => {
      expect(classifyContent(null)).toBe('ENGAGEMENT')
      expect(classifyContent('')).toBe('ENGAGEMENT')
      expect(classifyContent('   ')).toBe('ENGAGEMENT')
    })

    it('returns ENGAGEMENT for generic content', () => {
      expect(classifyContent('Krásný víkend všem!')).toBe('ENGAGEMENT')
      expect(classifyContent('How is everyone doing today?')).toBe('ENGAGEMENT')
      expect(classifyContent('Jaký máte plán na víkend?')).toBe('ENGAGEMENT')
    })

    it('returns ENGAGEMENT when no keywords match', () => {
      expect(classifyContent('Dnešní počasí je skvělé')).toBe('ENGAGEMENT')
      expect(classifyContent('Just a random thought')).toBe('ENGAGEMENT')
    })
  })

  describe('mixed language content', () => {
    it('handles Czech with diacritics', () => {
      expect(classifyContent('Příliš žluťoučký kůň - sleva!')).toBe('SALES')
    })

    it('handles mixed Czech and English', () => {
      expect(classifyContent('Buy now! Nakupte ještě dnes!')).toBe('SALES')
    })
  })

  describe('keyword priority', () => {
    it('prefers SALES over BRAND when both present with more sales', () => {
      // 2 sales keywords + % symbol
      expect(classifyContent('Sleva 50% na produkty našeho týmu')).toBe('SALES')
    })

    it('returns BRAND when more brand keywords present', () => {
      expect(classifyContent('Náš tým oslavuje výročí firmy')).toBe('BRAND')
    })
  })

  describe('edge cases', () => {
    it('handles very long text', () => {
      const longText = 'Kupte si naše produkty. '.repeat(100)
      expect(classifyContent(longText)).toBe('SALES')
    })

    it('handles special characters', () => {
      expect(classifyContent('Sleva!!! 🔥🔥🔥 50% off!!!')).toBe('SALES')
    })

    it('handles URLs in text', () => {
      expect(classifyContent('Nakupte na https://example.com/shop')).toBe('SALES')
    })
  })
})

describe('analyzeContentMix', () => {
  it('counts content types correctly', () => {
    const posts = [
      { message: 'Sleva 50%!' },
      { message: 'Sleva 30%!' },
      { message: 'Náš tým oslavuje výročí' },
      { message: 'Krásný den!' },
      { message: null },
    ]

    const result = analyzeContentMix(posts)

    expect(result.salesCount).toBe(2)
    expect(result.brandCount).toBe(1)
    expect(result.engagementCount).toBe(2)
    expect(result.total).toBe(5)
  })

  it('calculates percentages correctly', () => {
    const posts = [
      { message: 'Sleva 50%!' },
      { message: 'Sleva 30%!' },
      { message: 'Buy now!' },
      { message: 'Krásný den!' },
    ]

    const result = analyzeContentMix(posts)

    expect(result.salesPct).toBe(75) // 3/4
    expect(result.engagementPct).toBe(25) // 1/4
    expect(result.brandPct).toBe(0)
  })

  it('handles empty posts array', () => {
    const result = analyzeContentMix([])

    expect(result.salesCount).toBe(0)
    expect(result.brandCount).toBe(0)
    expect(result.engagementCount).toBe(0)
    expect(result.total).toBe(0)
    expect(result.salesPct).toBe(0)
  })

  it('handles all same type posts', () => {
    const posts = [{ message: 'Sleva!' }, { message: 'Akce!' }, { message: 'Výprodej!' }]

    const result = analyzeContentMix(posts)

    expect(result.salesCount).toBe(3)
    expect(result.salesPct).toBe(100)
  })
})

describe('hasCallToAction', () => {
  describe('Czech CTAs', () => {
    it('detects click CTAs', () => {
      expect(hasCallToAction('Klikněte na odkaz')).toBe(true)
      expect(hasCallToAction('Klikni sem')).toBe(true)
    })

    it('detects visit CTAs', () => {
      expect(hasCallToAction('Navštivte náš e-shop')).toBe(true)
      expect(hasCallToAction('Přejděte na stránku')).toBe(true)
    })

    it('detects "more info" CTAs', () => {
      expect(hasCallToAction('Více info v komentářích')).toBe(true)
      expect(hasCallToAction('Více informací na webu')).toBe(true)
    })

    it('detects bio link CTAs', () => {
      expect(hasCallToAction('Odkaz v bio')).toBe(true)
      expect(hasCallToAction('Odkaz v profilu')).toBe(true)
    })

    it('detects download CTAs', () => {
      expect(hasCallToAction('Stáhněte si katalog')).toBe(true)
      expect(hasCallToAction('Stáhni zdarma')).toBe(true)
    })

    it('detects registration CTAs', () => {
      expect(hasCallToAction('Zaregistruj se nyní')).toBe(true)
    })
  })

  describe('English CTAs', () => {
    it('detects click CTAs', () => {
      expect(hasCallToAction('Click here for more')).toBe(true)
      expect(hasCallToAction('Click the link')).toBe(true)
    })

    it('detects learn/read more CTAs', () => {
      expect(hasCallToAction('Learn more about us')).toBe(true)
      expect(hasCallToAction('Read more on our blog')).toBe(true)
    })

    it('detects shop CTAs', () => {
      expect(hasCallToAction('Shop now!')).toBe(true)
    })

    it('detects bio link CTAs', () => {
      expect(hasCallToAction('Link in bio')).toBe(true)
    })

    it('detects sign up CTAs', () => {
      expect(hasCallToAction('Sign up today')).toBe(true)
      expect(hasCallToAction('Register now')).toBe(true)
    })

    it('detects download CTAs', () => {
      expect(hasCallToAction('Download the app')).toBe(true)
    })
  })

  describe('non-CTA content', () => {
    it('returns false for null', () => {
      expect(hasCallToAction(null)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(hasCallToAction('')).toBe(false)
    })

    it('returns false for regular text', () => {
      expect(hasCallToAction('Dnes bylo hezky.')).toBe(false)
      expect(hasCallToAction('Just sharing a photo')).toBe(false)
      expect(hasCallToAction('Krásný den všem')).toBe(false)
    })

    it('returns false for informational content', () => {
      expect(hasCallToAction('Naše otevírací doba je 9-17')).toBe(false)
      expect(hasCallToAction('We are located in Prague')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('is case insensitive', () => {
      expect(hasCallToAction('KLIKNĚTE ZDE')).toBe(true)
      expect(hasCallToAction('SHOP NOW')).toBe(true)
    })

    it('handles mixed case', () => {
      expect(hasCallToAction('Learn More About Us')).toBe(true)
    })
  })
})
