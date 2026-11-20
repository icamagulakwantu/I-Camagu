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
