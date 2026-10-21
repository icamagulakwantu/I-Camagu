// All the words for the step-by-step ceremony flow live here, isiXhosa first
// with English underneath. Keep the isiXhosa short and plain; where there is
// no confident isiXhosa wording the entry has only an English line. A
// first-language speaker should read every xh line once before launch.
export const STEPS = [
  { id: 'what', xh: 'Ngowuphi umsebenzi?', en: 'What kind of ceremony is it?' },
  { id: 'when', xh: 'Igama nomhla', en: 'Name and date' },
  { id: 'who', xh: 'Baza kuza bangaphi abantu?', en: 'How many people are coming?' },
  { id: 'money', xh: 'Imali yakho', en: 'Your budget' },
  { id: 'list', xh: 'Uluhlu lokuthenga', en: 'Shopping list and what you pay' },
  { id: 'summary', xh: 'Isishwankathelo', en: 'Summary' },
]

export const BUTTONS = {
  back: { xh: 'Buya', en: 'Back' },
  next: { xh: 'Qhubeka', en: 'Next' },
  save: { xh: 'Gcina', en: 'Save' },
  create: { xh: 'Qala', en: 'Create my plan' },
  change: { xh: 'Guqula', en: 'Change' },
  add: { xh: 'Ongeza', en: 'Add' },
  summary: { xh: 'Isishwankathelo', en: 'See summary' },
  cancel: { xh: 'Rhoxisa', en: 'Cancel' },
  buy: { xh: 'Thenga', en: 'Buy' },
  startNew: { xh: 'Qala umsebenzi omtsha', en: 'Start a new ceremony' },
  share: { xh: 'Yabelana', en: 'Share' },
  remove: { xh: 'Cima', en: 'Delete ceremony' },
  template: { en: 'Save as template' },
  timeline: { en: 'Timeline' },
  bar: { en: 'Ekoyini Bar' },
}

export const LABELS = {
  ceremonyName: { xh: 'Igama lomsebenzi', en: 'Name of the ceremony' },
  date: { xh: 'Umhla', en: 'Date' },
  guests: { xh: 'Inani labantu', en: 'Number of people' },
  budget: { xh: 'Imali yakho', en: 'Your budget' },
  spent: { xh: 'Imali esetyenzisiweyo', en: 'Money spent so far' },
  left: { xh: 'Imali eseleyo', en: 'Money left' },
  over: { xh: 'Ugqithile', en: 'Over your budget' },
  stillToBuy: { xh: 'Okusele ukuthengwa', en: 'Still to buy (guide price)' },
  paid: { xh: 'Ndihlawulile', en: 'I paid' },
  guide: { xh: 'Isikhokelo', en: 'Guide price' },
  onList: { en: 'On your list' },
  unexpected: { en: 'Unexpected' },
  tapToChange: { xh: 'Cofa ukuguqula', en: 'Tap to change' },
  family: { en: 'Family pledges' },
}

export const EXPLAIN_MONEY = 'Guide prices are only a help. Only what you really paid comes off your budget.'
