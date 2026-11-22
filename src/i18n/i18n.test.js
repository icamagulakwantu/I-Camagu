import { describe, expect, it } from 'vitest'
import { longDay, translate } from './index.jsx'
import XH from './xh.js'

describe('isiXhosa', () => {
  it('translates known text, and falls back to English otherwise', () => {
    expect(translate('xh', 'Home')).toBe('Ekhaya')
    expect(translate('en', 'Home')).toBe('Home')
    expect(translate('xh', 'A sentence nobody translated yet')).toBe('A sentence nobody translated yet')
  })
  it('fills placeholders in either language', () => {
    expect(translate('xh', '{n} things still to do', { n: 3 })).toBe('kusasele izinto ezi-3')
    expect(translate('en', '{n} things still to do', { n: 3 })).toBe('3 things still to do')
  })
  it('has no empty translations, and keeps every placeholder', () => {
    for (const [en, xh] of Object.entries(XH)) {
      expect(xh.trim(), en).not.toBe('')
      const holes = (text) => (text.match(/\{\w+\}/g) || []).sort().join(',')
      expect(holes(xh), en).toBe(holes(en))
    }
  })
  it('writes the date with isiXhosa day and month names', () => {
    expect(longDay('xh', new Date(2026, 10, 22))).toBe('Cawe, 22 EyeNkanga (Nov)')
  })
})

describe('isiXhosa countdowns and dates', () => {
  it('reads number phrases by shape, keeping the capital', () => {
    expect(translate('xh', 'in 13 days')).toBe('ngeentsuku ezi-13')
    expect(translate('xh', 'In 4 weeks')).toBe('Ngeeveki ezi-4')
    expect(translate('xh', 'Tomorrow')).toBe('Ngomso')
    expect(translate('en', 'In 4 weeks')).toBe('In 4 weeks')
  })
  it('writes ceremony dates with isiXhosa month names', async () => {
    const { formatDate } = await import('./index.jsx')
    expect(formatDate('xh', '2026-12-05T00:00:00Z', { year: true, utc: true })).toBe('Mgqibelo, 5 EyoMnga (Dec) 2026')
  })
})
