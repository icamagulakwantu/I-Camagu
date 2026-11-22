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

export function translate(lang, text, vars) {
  const out = (lang === 'xh' && XH[text]) || text
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
const XH_MONTHS = ['Eyomqungu', 'Eyomdumba', 'Eyokwindla', 'UTshazimpuzi', 'UCanzibe', 'Isilimela', 'EyeKhala', 'EyeThupha', 'EyoMsintsi', 'EyeDwarha', 'EyeNkanga', 'EyoMnga']

// "Sunday, 22 November" or "Cawe, 22 EyeNkanga".
export function longDay(lang, date = new Date()) {
  if (lang === 'xh') return `${XH_DAYS[date.getDay()]}, ${date.getDate()} ${XH_MONTHS[date.getMonth()]}`
  return date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
}
