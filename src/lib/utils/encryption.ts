import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env } from '@/lib/config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const ENCODING = 'base64' as const

function getEncryptionKey(): Buffer {
  const key = env.ENCRYPTION_KEY

  // Key should be base64 encoded 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }

  return keyBuffer
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64 encoded)
  return [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(':')
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()

  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Invalid ciphertext format: missing parts')
  }

  const iv = Buffer.from(ivBase64, ENCODING)
  const authTag = Buffer.from(authTagBase64, ENCODING)
  const encrypted = Buffer.from(encryptedBase64, ENCODING)

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length')
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  return decrypted.toString('utf8')
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64')
}
