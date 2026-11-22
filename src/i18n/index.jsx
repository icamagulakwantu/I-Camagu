// Language: English or isiXhosa, chosen in More and remembered on this phone.
//
// t('English text', { n: 3 }) returns the isiXhosa for that exact English
// text when the member chose isiXhosa and a translation exists (xh.js), and
// the English otherwise, so a screen not yet translated simply stays in
// English. {name} placeholders are filled from the second argument.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import XH from './xh.js'

const KEY = 'icamagu_language'
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'xh', label: 'isiXhosa' },
]

const LanguageContext = createContext({ lang: 'en', setLang: () => {} })

function stored() {
  try { return localStorage.getItem(KEY) === 'xh' ? 'xh' : 'en' } catch { return 'en' }
}

// Phrases built from a number ("in 13 days"): matched by shape, so the
// countdown helpers can stay in English and still read in isiXhosa.
const XH_PATTERNS = [
  [/^in (\d+) days$/i, 'ngeentsuku ezi-$1'],
  [/^in (\d+) weeks$/i, 'ngeeveki ezi-$1'],
  [/^in (\d+) months$/i, 'ngeenyanga ezi-$1'],
  [/^in (\d+) years$/i, 'ngeminyaka eyi-$1'],
  [/^overdue by (\d+) days$/i, 'kudlule iintsuku ezi-$1'],
]

function xhFor(text) {
  if (XH[text]) return XH[text]
  const lower = XH[text.charAt(0).toLowerCase() + text.slice(1)]
  let out = lower || null
  if (!out) {
    for (const [re, rep] of XH_PATTERNS) if (re.test(text)) { out = text.replace(re, rep); break }
  }
  if (!out) return null
  // Keep a capital where the English had one ("In 13 days").
  return /^[A-Z]/.test(text) ? out.charAt(0).toUpperCase() + out.slice(1) : out
}

export function translate(lang, text, vars) {
  const out = (lang === 'xh' && typeof text === 'string' && xhFor(text)) || text
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : out
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(stored)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = useCallback((next) => {
    const value = next === 'xh' ? 'xh' : 'en'
    try { localStorage.setItem(KEY, value) } catch { /* storage blocked: this visit only */ }
    setLangState(value)
  }, [])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useT() {
  const { lang } = useContext(LanguageContext)
  return useCallback((text, vars) => translate(lang, text, vars), [lang])
}

// isiXhosa day and month names, for dates written out in full.
const XH_DAYS = ['Cawe', 'Mvulo', 'Lwesibini', 'Lwesithathu', 'Lwesine', 'Lwesihlanu', 'Mgqibelo']
const XH_MONTHS = ['EyoMqungu', 'EyoMdumba', 'EyoKwindla', 'UTshazimpuzi', 'UCanzibe', 'Isilimela', 'EyeKhala', 'EyeThupha', 'EyoMsintsi', 'EyeDwarha', 'EyeNkanga', 'EyoMnga']

// A date in the member's language. Options: weekday, year, utc (ceremony
// dates are stored at UTC midnight). English keeps the short en-ZA form.
export function formatDate(lang, value, { weekday = true, year = false, utc = false } = {}) {
  const d = new Date(value)
  if (lang === 'xh') {
    const get = (f) => (utc ? d[`getUTC${f}`]() : d[`get${f}`]())
    const parts = `${get('Date')} ${XH_MONTHS[get('Month')]}${year ? ` ${get('FullYear')}` : ''}`
    return weekday ? `${XH_DAYS[get('Day')]}, ${parts}` : parts
  }
  return d.toLocaleDateString('en-ZA', { ...(weekday ? { weekday: 'short' } : {}), day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), ...(utc ? { timeZone: 'UTC' } : {}) })
}

// "Sunday, 22 November" or "Cawe, 22 EyeNkanga".
export function longDay(lang, date = new Date()) {
  if (lang === 'xh') return `${XH_DAYS[date.getDay()]}, ${date.getDate()} ${XH_MONTHS[date.getMonth()]}`
  return date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
}
