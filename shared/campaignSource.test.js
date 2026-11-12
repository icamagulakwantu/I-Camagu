import { describe, expect, it } from 'vitest'
import { cleanCampaignSource } from './campaignSource.js'

describe('cleanCampaignSource', () => {
  it('accepts short pamphlet and QR codes', () => {
    expect(cleanCampaignSource('pamphlet1')).toBe('pamphlet1')
    expect(cleanCampaignSource('qr_east-london')).toBe('qr_east-london')
    expect(cleanCampaignSource('a'.repeat(40))).toBe('a'.repeat(40))
  })

  it('rejects anything else', () => {
    for (const value of [undefined, null, 42, {}, '', ' pamphlet', 'a'.repeat(41), 'x y', 'café', '<script>', 'a/b']) {
      expect(cleanCampaignSource(value)).toBeNull()
    }
  })
})
