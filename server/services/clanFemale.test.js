import { describe, expect, it } from 'vitest'
import { femaleForm, femaleRoots } from './clanMatchService.js'

describe('female clan forms', () => {
  it('reads the root from a female form', () => {
    expect(femaleRoots('MamCirha')).toEqual(['Cirha'])
    expect(femaleRoots('Mam-Tshawe')).toEqual(['Tshawe'])
    expect(femaleRoots('mam cwerha')).toEqual(['cwerha'])
    expect(femaleRoots('Ma-Zangwa')).toEqual(['Zangwa'])
    expect(femaleRoots('MaMadiba')).toEqual(['adiba', 'Madiba'])
  })
  it('never cuts a clan that just starts with Ma', () => {
    expect(femaleRoots('Madiba')).toEqual([])
    expect(femaleRoots('Majola')).toEqual([])
    expect(femaleRoots('Cirha')).toEqual([])
  })
  it('shows the female form of a clan', () => {
    expect(femaleForm('AmaCirha')).toBe('MamCirha')
    expect(femaleForm('AmaTshawe')).toBe('MamTshawe')
    expect(femaleForm('AmaMadiba')).toBe('MaMadiba')
  })
})

describe('every form of one clan (founder, 23 Nov 2026)', () => {
  it('reads plural, female, one-person and spoken forms', async () => {
    const { isidukoReadings, sameIsiduko } = await import('../../shared/isiduko.js')
    expect(isidukoReadings('AmaTshawe')[0]).toBe('tshawe')
    expect(isidukoReadings('MaTshawe')).toContain('tshawe')
    expect(isidukoReadings('Mamthunzi')).toContain('mthunzi')
    expect(isidukoReadings('Mankomo')).toContain('nkomo')
    expect(isidukoReadings('Mzangwa')).toContain('zangwa')
    expect(isidukoReadings('Qwathi')).toContain('mqwathi')
    expect(isidukoReadings('uTshawe')).toContain('tshawe')
    expect(isidukoReadings('ngu Tshawe')).toContain('tshawe')
    expect(isidukoReadings('NguTshawe')).toContain('tshawe')
    expect(isidukoReadings('Tshawe clan')).toContain('tshawe')
    // "ngu" and "u" are only cut before a space or a capital.
    expect(isidukoReadings('Ngubengcuka')).not.toContain('bengcuka')
    expect(isidukoReadings('Ubuntu')).not.toContain('buntu')
    for (const form of ['Tshawe', 'AmaTshawe', 'Ama-Tshawe', 'amatshawe', 'MamTshawe', 'Mam-Tshawe', 'MaTshawe', 'uTshawe']) {
      expect(sameIsiduko(form, 'Tshawe')).toBe(true)
    }
    expect(sameIsiduko('Mzangwa', 'AmaZangwa')).toBe(true)
    expect(sameIsiduko('Tshawe', 'Zangwa')).toBe(false)
  })
})

describe('comparing two members without the register', () => {
  it('never splits a clan that only starts with Ma', async () => {
    const { sameIsiduko } = await import('../../shared/isiduko.js')
    expect(sameIsiduko('Madiba', 'Diba')).toBe(false)
    expect(sameIsiduko('Majola', 'Jola')).toBe(false)
    expect(sameIsiduko('MaMadiba', 'AmaMadiba')).toBe(true)
    expect(sameIsiduko('Mamthunzi', 'AmaMthunzi')).toBe(true)
    expect(sameIsiduko('Mankomo', 'AmaNkomo')).toBe(false) // written together, lower case: left to the register
    expect(sameIsiduko('MaNkomo', 'AmaNkomo')).toBe(true)
    expect(sameIsiduko('Qwathi', 'AmaMqwathi')).toBe(true)
  })
})
