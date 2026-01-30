import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomBytes } from 'crypto'
import { encrypt, decrypt, generateEncryptionKey } from '@/lib/utils/encryption'

// Generate a valid test key (32 bytes = 256 bits, base64 encoded)
// Using actual 32 random bytes encoded to base64
const TEST_ENCRYPTION_KEY = randomBytes(32).toString('base64')

describe('Encryption Utils', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', TEST_ENCRYPTION_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('encrypt', () => {
    it('encrypts a string and returns a formatted ciphertext', () => {
      const plaintext = 'Hello, World!'
      const ciphertext = encrypt(plaintext)

      // Should be in format: iv:authTag:encrypted (all base64)
      const parts = ciphertext.split(':')
      expect(parts).toHaveLength(3)

      // Each part should be valid base64
      parts.forEach((part) => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow()
      })
    })

    it('produces different ciphertext for the same plaintext (due to random IV)', () => {
      const plaintext = 'Test message'
      const ciphertext1 = encrypt(plaintext)
      const ciphertext2 = encrypt(plaintext)

      expect(ciphertext1).not.toBe(ciphertext2)
    })

    it('encrypts empty string', () => {
      const ciphertext = encrypt('')
      expect(ciphertext).toBeDefined()
      expect(ciphertext.split(':')).toHaveLength(3)
    })

    it('encrypts unicode characters', () => {
      const plaintext = 'Příliš žluťoučký kůň 🐴 úpěl 日本語'
      const ciphertext = encrypt(plaintext)
      const decrypted = decrypt(ciphertext)
      expect(decrypted).toBe(plaintext)
    })

    it('throws error when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '')
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')
    })

    it('throws error when ENCRYPTION_KEY has invalid length', () => {
      vi.stubEnv('ENCRYPTION_KEY', Buffer.from('short-key').toString('base64'))
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a base64-encoded 32-byte key')
    })
  })

  describe('decrypt', () => {
    it('decrypts an encrypted string back to original', () => {
      const plaintext = 'Secret message 123'
      const ciphertext = encrypt(plaintext)
      const decrypted = decrypt(ciphertext)

      expect(decrypted).toBe(plaintext)
    })

    it('decrypts long strings correctly', () => {
      const plaintext = 'A'.repeat(10000)
      const ciphertext = encrypt(plaintext)
      const decrypted = decrypt(ciphertext)

      expect(decrypted).toBe(plaintext)
    })

    it('throws error for invalid ciphertext format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid ciphertext format')
      expect(() => decrypt('part1:part2')).toThrow('Invalid ciphertext format')
    })

    it('throws error for empty parts in ciphertext', () => {
      expect(() => decrypt('::ciphertext')).toThrow('Invalid ciphertext format: missing parts')
      expect(() => decrypt('iv::ciphertext')).toThrow('Invalid ciphertext format: missing parts')
    })

    it('throws error for invalid IV length', () => {
      // Valid base64 but wrong IV length (should be 16 bytes)
      const shortIv = Buffer.from('short').toString('base64')
      const authTag = Buffer.from('0123456789abcdef').toString('base64')
      const encrypted = Buffer.from('encrypted').toString('base64')

      expect(() => decrypt(`${shortIv}:${authTag}:${encrypted}`)).toThrow('Invalid IV length')
    })

    it('throws error for invalid auth tag length', () => {
      const iv = Buffer.from('0123456789abcdef').toString('base64') // 16 bytes
      const shortAuthTag = Buffer.from('short').toString('base64')
      const encrypted = Buffer.from('encrypted').toString('base64')

      expect(() => decrypt(`${iv}:${shortAuthTag}:${encrypted}`)).toThrow('Invalid auth tag length')
    })

    it('throws error for tampered ciphertext (authentication failure)', () => {
      const plaintext = 'Original message'
      const ciphertext = encrypt(plaintext)
      const parts = ciphertext.split(':')

      // Tamper with the encrypted part
      const tamperedEncrypted = Buffer.from('tampered-data-here!!').toString('base64')
      const tamperedCiphertext = `${parts[0]}:${parts[1]}:${tamperedEncrypted}`

      expect(() => decrypt(tamperedCiphertext)).toThrow()
    })
  })

  describe('generateEncryptionKey', () => {
    it('generates a valid base64 encoded key', () => {
      const key = generateEncryptionKey()

      // Should be valid base64
      expect(() => Buffer.from(key, 'base64')).not.toThrow()
    })

    it('generates a 32-byte key', () => {
      const key = generateEncryptionKey()
      const keyBuffer = Buffer.from(key, 'base64')

      expect(keyBuffer.length).toBe(32)
    })

    it('generates different keys each time', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })
  })

  describe('encrypt/decrypt integration', () => {
    it('handles special characters in plaintext', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const ciphertext = encrypt(specialChars)
      const decrypted = decrypt(ciphertext)

      expect(decrypted).toBe(specialChars)
    })

    it('handles newlines and whitespace', () => {
      const text = 'Line 1\nLine 2\r\nLine 3\tTabbed'
      const ciphertext = encrypt(text)
      const decrypted = decrypt(ciphertext)

      expect(decrypted).toBe(text)
    })

    it('handles JSON strings', () => {
      const json = JSON.stringify({ token: 'secret', expiry: 12345 })
      const ciphertext = encrypt(json)
      const decrypted = decrypt(ciphertext)

      expect(JSON.parse(decrypted)).toEqual({ token: 'secret', expiry: 12345 })
    })
  })
})
