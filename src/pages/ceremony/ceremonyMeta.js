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
  INTAMBO_ENKULU: { name: 'Intambo Enkulu', desc: 'A second imbeleko: a higher acceptance', titleExample: 'Intambo Enkulu kaThandi' },
  UKUKHAPHA: { name: 'Ukukhapha', desc: 'Accompanying the departed', titleExample: 'Ukukhapha kukaVumile' },
  INKOBE_ZIKA_MAMA: { name: 'Inkobe zikaMama', desc: 'A thanksgiving for a mother', titleExample: 'Inkobe zikaNoluthando' },
  UKUBUYISA: { name: 'Ukubuyisa', desc: 'Bringing the departed home', titleExample: 'Ukubuyisa kukaNomsa' },
  UMSEBENZI_WEGQIRHA: { name: 'Ukuphuthuma', desc: "The igqirha's calling", titleExample: 'Ukuphuthuma kukaZanele' },
  IMBELEKO: { name: 'Imbeleko', desc: 'Welcoming a child', titleExample: 'Imbeleko kaLuthando' },
  INTONJANE: { name: 'Intonjane', desc: 'Coming of age', titleExample: 'Intonjane kaAyanda' },
  WEDDING: { name: 'Wedding', desc: 'Marriage celebration', titleExample: "Sindiswa's Wedding" },
  GENERAL_EVENT: { name: 'General Event', desc: 'Custom event', titleExample: 'Family gathering, July 2026' },
}

export const typeName = (typeId) => CEREMONY_META[typeId]?.name || String(typeId || '').replace(/_/g, ' ')
