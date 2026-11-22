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

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The pieces of a date in isiXhosa: the traditional month name, with the
// English month kept alongside it (founder's choice) so nobody has to guess.
function xhParts(value, { weekday = true, year = false, utc = false } = {}) {
  const d = new Date(value)
  const get = (f) => (utc ? d[`getUTC${f}`]() : d[`get${f}`]())
  return {
    lead: `${weekday ? `${XH_DAYS[get('Day')]}, ` : ''}${get('Date')} ${XH_MONTHS[get('Month')]}`,
    en: EN_MONTHS[get('Month')],
    tail: year ? ` ${get('FullYear')}` : '',
  }
}

function enDate(value, { weekday = true, year = false, utc = false, long = false } = {}) {
  const style = long ? 'long' : 'short'
  return new Date(value).toLocaleDateString('en-ZA', { ...(weekday ? { weekday: style } : {}), day: 'numeric', month: style, ...(year ? { year: 'numeric' } : {}), ...(utc ? { timeZone: 'UTC' } : {}) })
}

// A date as plain text (inside a sentence): "Mgqibelo, 5 EyoMnga (Dec) 2026".
export function formatDate(lang, value, opts = {}) {
  if (lang !== 'xh') return enDate(value, opts)
  const p = xhParts(value, opts)
  return `${p.lead} (${p.en})${p.tail}`
}

// A date on its own on screen: the English month sits small and lowered
// beneath the isiXhosa one, like a subscript.
export function DateText({ value, ...opts }) {
  const { lang } = useLanguage()
  if (lang !== 'xh') return <>{enDate(value, opts)}</>
  const p = xhParts(value, opts)
  return (
    <>
      {p.lead}
      <sub className="ml-0.5 align-sub text-[0.68em] font-medium normal-case tracking-normal opacity-75">{p.en}</sub>
      {p.tail}
    </>
  )
}

// "Sunday, 22 November" or "Cawe, 22 EyeNkanga".
export function longDay(lang, date = new Date()) {
  if (lang === 'xh') return formatDate('xh', date)
  return enDate(date, { long: true })
}
