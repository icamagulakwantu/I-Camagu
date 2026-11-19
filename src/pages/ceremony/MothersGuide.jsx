import { useState } from 'react'
import Icon from '../../components/Icon.jsx'

// A guide for the initiate's mother. Drawn from research with Xhosa mothers
// (Makupula 2026; the 2025 scoping review on ulwaluko; studies of women's
// roles in the Eastern Cape): mothers prepare their sons emotionally,
// spiritually and with money, prepare food and umqombothi, and carry umgidi,
// while what happens at the ibhoma belongs to the men. It reveals nothing
// sacred. Every family does things its own way.
const SECTIONS = [
  {
    title: 'Before he goes',
    icon: 'heart',
    points: [
      'Prepare him in heart and spirit. Talk with him, and pray with him if that is your way.',
      'Help carry the costs. Everything is in this plan, and family can pledge from the link you share.',
      'Know who will care for him. His ingcibi and ikhankatha should be registered, and verified on i-Camagu.',
    ],
  },
  {
    title: 'While he is on the mountain',
    icon: 'sprout',
    points: [
      'Food often comes from the women at home. For the first seven days it has no salt and little water.',
      'You will not hear what happens at the ibhoma. That is normal and part of the respect. News comes through the men of the family.',
      'Lean on other mothers and on prayer. Many mothers say this is where they find their strength.',
    ],
  },
  {
    title: 'Bringing him home: umgidi',
    icon: 'home',
    points: [
      'The kitchen and the umqombothi are the women’s pride at umgidi. The umqombothi calculator works out how much to brew.',
      'His new clothes as ikrwala: hat, jacket, shirt, trousers and shoes.',
      'The women who welcome him with ingqongqo, and the family and friends you invite.',
    ],
  },
]

export default function MothersGuide({ onOpenUmqombothi }) {
  const [open, setOpen] = useState(false)
  return (
    <section aria-label="A guide for his mother" className="overflow-hidden rounded-[24px] bg-[#fffdf9] shadow-[0_18px_36px_-26px_rgba(43,30,18,0.55)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-5 text-left">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-terracotta-dark text-white">
          <Icon name="heartHandshake" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-terracotta-dark">Kumama · For his mother</span>
          <span className="mt-0.5 block font-display text-[1.2rem] font-semibold leading-tight text-ink">What is yours to carry</span>
        </span>
        <Icon name={open ? 'arrowUp' : 'arrowDown'} size={16} />
      </button>
      {open && (
        <div className="space-y-3 px-5 pb-5">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Mothers carry ulwaluko too: you prepare him, feed the family and bring him home at umgidi. Here is what is yours, and what belongs to the men.
          </p>
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-[18px] border border-ink/[0.06] bg-white p-3.5">
              <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><Icon name={section.icon} size={15} /> {section.title}</p>
              <ul className="mt-2 space-y-1.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2 text-[13px] leading-snug text-ink">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-terracotta" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {onOpenUmqombothi && (
            <button type="button" onClick={onOpenUmqombothi} className="pressable text-sm font-extrabold text-terracotta-dark">Open the umqombothi calculator →</button>
          )}
          <p className="text-xs italic text-ink-muted">Gathered from research with Xhosa mothers. Every family does things its own way.</p>
        </div>
      )}
    </section>
  )
}
