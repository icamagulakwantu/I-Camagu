import { CEREMONY_IMAGE } from './ceremonyImages.js'

// What each ceremony is, in a line. Shared by the Ceremonies tab and the
// ceremony page so a ceremony is described the same way everywhere.
export const CEREMONY_META = {
  ULWALUKO: { label: 'Ulwaluko', english: 'Initiation', desc: 'The passage into manhood — provisioning, seclusion and the return.', image: CEREMONY_IMAGE.ULWALUKO },
  UMGIDI: { label: 'Umgidi', english: 'Homecoming', desc: 'The feast that welcomes the initiate back into the homestead.', image: CEREMONY_IMAGE.UMGIDI },
  INTAMBO_ENKULU: { label: 'Intambo Enkulu', english: 'The great bond', desc: 'The ceremony that binds two families together.', image: CEREMONY_IMAGE.INTAMBO_ENKULU },
  UKUKHAPHA: { label: 'Ukukhapha', english: 'Accompanying the departed', desc: 'The rite that walks a loved one to the ancestors.', image: CEREMONY_IMAGE.UKUKHAPHA },
  INKOBE_ZIKA_MAMA: { label: 'Inkobe zikaMama', english: "Mother's harvest", desc: "A thanksgiving rite honouring a mother's provision.", image: CEREMONY_IMAGE.INKOBE_ZIKA_MAMA },
  UKUBUYISA: { label: 'Ukubuyisa', english: 'Bringing the spirit home', desc: 'A year on, the departed is called back to the homestead.', image: CEREMONY_IMAGE.UKUBUYISA },
  UMSEBENZI_WEGQIRHA: { label: 'Umsebenzi weGqirha', english: "Healer's ritual", desc: "A ceremony marking a traditional healer's calling.", image: CEREMONY_IMAGE.UMSEBENZI_WEGQIRHA },
  WEDDING: { label: 'Wedding', english: 'Umtshato', desc: "Lobola talks, the handing over, and the two families' feast.", image: CEREMONY_IMAGE.WEDDING },
  GENERAL_EVENT: { label: 'General Event', english: 'Nayiphi na', desc: 'A gathering the family must mark, on your own terms.' },
}
