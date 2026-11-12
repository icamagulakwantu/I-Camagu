import { describe, expect, it, vi } from 'vitest'

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({}) }))
const { stokvelIdFromInput } = await import('./Stokvels.jsx')

describe('stokvelIdFromInput', () => {
  it('takes the id out of a pasted invite link', () => {
    expect(stokvelIdFromInput('https://i-camagu.co.za/join/stokvel/abc-123')).toBe('abc-123')
    expect(stokvelIdFromInput('Join us: https://i-camagu.co.za/join/stokvel/abc%20x?x=1 thanks')).toBe('abc x')
  })
  it('keeps a bare id as it is', () => {
    expect(stokvelIdFromInput('  abc-123 ')).toBe('abc-123')
    expect(stokvelIdFromInput('')).toBe('')
  })
})
