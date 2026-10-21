// titleExample is the placeholder shown when naming a plan. It is not a name
// swap: isiXhosa builds the possessive from the noun class of the ceremony
// itself, so the linking word changes with the rite. Umgidi (class 3) takes
// ka-, inkobe (class 10) takes zika-, ukukhapha and ukubuyisa (class 15) take
// kuka-, ulwaluko (class 11) takes luka-. Writing "Umgidi zikaSihle" would be
// wrong in the same way "Sihle's the Umgidi" is wrong in English, so keep the
// linking word with the rite it belongs to.
export const CEREMONY_META = {
  ULWALUKO: { name: 'Ulwaluko', desc: 'Initiation & manhood', titleExample: 'Ulwaluko lukaLindani' },
  UMGIDI: { name: 'Umgidi', desc: 'Homecoming celebration', titleExample: 'Umgidi kaSihle' },
  INTAMBO_ENKULU: { name: 'Intambo Enkulu', desc: 'Ceremony planning', titleExample: 'Intambo Enkulu kaThandi' },
  UKUKHAPHA: { name: 'Ukukhapha', desc: 'Ceremony planning', titleExample: 'Ukukhapha kukaVumile' },
  INKOBE_ZIKA_MAMA: { name: 'Inkobe zikaMama', desc: 'Ceremony planning', titleExample: 'Inkobe zikaNoluthando' },
  UKUBUYISA: { name: 'Ukubuyisa', desc: 'Ceremony planning', titleExample: 'Ukubuyisa kukaNomsa' },
  UMSEBENZI_WEGQIRHA: { name: 'Umsebenzi weGqirha', desc: 'Ceremony planning', titleExample: 'Umsebenzi kaZanele' },
  WEDDING: { name: 'Wedding', desc: 'Marriage celebration', titleExample: "Sindiswa's Wedding" },
  GENERAL_EVENT: { name: 'General Event', desc: 'Custom event', titleExample: 'Family gathering, July 2026' },
}

export const typeName = (typeId) => CEREMONY_META[typeId]?.name || String(typeId || '').replace(/_/g, ' ')
