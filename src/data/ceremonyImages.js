// One photograph per ceremony type, shared by the Ceremonies tab and Home so a
// ceremony always looks the same wherever it appears. Ulwaluko and umgidi
// are founder-supplied photos hosted on the Hercules CDN.
export const CEREMONY_IMAGE = {
  ULWALUKO: 'https://hercules-cdn.com/file_DyjWbFXGDDgiqgyH6wrcRaEx',
  UMGIDI: 'https://hercules-cdn.com/file_wxyYBh6l6xbEhksr09BuCEsR',
  INTAMBO_ENKULU: '/images/ceremonies/intambo-enkulu.jpg',
  UKUKHAPHA: '/images/ceremonies/ukukhapha.jpg',
  INKOBE_ZIKA_MAMA: '/images/ceremonies/inkobe-zika-mama.jpg',
  UKUBUYISA: '/images/ceremonies/ukubuyisa.jpg',
  UMSEBENZI_WEGQIRHA: '/images/ceremonies/umsebenzi.jpg',
  WEDDING: '/images/ceremonies/wedding.jpg',
}

// Ceremony types without their own photo share the homestead feast table.
export const FALLBACK_CEREMONY_IMAGE = '/images/ceremonies/umgidi.jpg'

export function ceremonyImage(type) {
  return CEREMONY_IMAGE[type] || FALLBACK_CEREMONY_IMAGE
}
