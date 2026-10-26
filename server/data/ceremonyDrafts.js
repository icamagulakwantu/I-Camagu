// Founder-reviewed draft catalogue. These entries are intentionally not
// exposed as live planner templates until the checklist, animal rules and
// quantities have been reviewed. A null rateKey always means Price to confirm;
// a rateKey only points at COST_RATES and is not proof that the rate is current.
export const DRAFT_CEREMONY_TYPES = Object.freeze({
  IMBELEKO: {
    name: 'Imbeleko',
    english: 'Introducing a child to the family and ancestors',
    status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'A rite introducing a child to family and ancestors; animal, timing and hide details vary by family.',
    phases: [
      { phase: 'PLANNING', items: [
        { label: 'Agree the date with the child’s father’s family and inform the mother’s family', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Choose the elder who will lead the family’s address', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Who leads' },
        { label: 'Record the child’s names and both family iziduko for the elder', quantity: 1, unit: 'task', rateKey: null },
      ]},
      { phase: 'ANIMAL_AND_OFFERING', items: [
        { label: 'Goat for the ceremony', quantity: 1, unit: 'animal', rateKey: 'goat_standard', founderToConfirm: 'Confirm animal, sex/colour and whether sheep is used' },
        { label: 'Imphepho', quantity: 2, unit: 'bundle', rateKey: 'imphepho_bundle' },
        { label: 'Hide strip for the child', quantity: 1, unit: 'piece', rateKey: null, founderToConfirm: 'Confirm animal hide and preparation' },
      ]},
      { phase: 'FOOD_AND_DRINK', items: [
        { label: 'Umqombothi', quantity: 6, unit: 'bhekile', rateKey: 'umqombothi_bhekile', founderToConfirm: 'Adjust to guest numbers' },
        { label: 'Maize meal for pap', quantity: 1, unit: '50kg bag', rateKey: 'maize_meal_50kg' },
        { label: 'Vegetables and cooking oil', quantity: 1, unit: 'kit', rateKey: null },
        { label: 'Courtesy brandy for elders', quantity: 2, unit: 'bottle', rateKey: 'brandy_750ml' },
        { label: 'Plates and spoons', quantity: 2, unit: 'pack of 50', rateKey: 'plastic_plate_pack_50' },
      ]},
      { phase: 'CEREMONY_DAY', items: [
        { label: 'Elder introduces the child by name and clan praises', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Slaughter the animal according to the family’s practice', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Timing and person responsible' },
        { label: 'Place the hide strip on the child', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Share the meat according to the family’s practice', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Order of sharing' },
      ]},
      { phase: 'CLOSING', items: [{ label: 'Record attendance and gifts (Ukugida)', quantity: 1, unit: 'task', rateKey: null }]},
    ],
    questions: ['What age range is used in your family?', 'Is the rite the same for a boy and a girl?', 'Is the animal always supplied by the father’s side?'],
  },
  INTONJANE: {
    name: 'Intonjane', english: 'Young woman’s coming-of-age rite', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'A sensitive rite led by senior women; private teachings must not be required in a public checklist.',
    phases: [
      { phase: 'PLANNING_WOMEN_ELDERS', items: [
        { label: 'Senior women set the dates and lead planning', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Senior women to confirm' },
        { label: 'Agree the place and length of the separation', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Confirm length and place' },
      ]},
      { phase: 'PREPARATION', items: [
        { label: 'Umqombothi for the gathering', quantity: 10, unit: 'bhekile', rateKey: 'umqombothi_bhekile', founderToConfirm: 'Confirm quantity' },
        { label: 'Maize meal', quantity: 1, unit: '50kg bag', rateKey: 'maize_meal_50kg' },
        { label: 'Animal for the ceremony', quantity: 1, unit: 'animal', rateKey: 'goat_standard', founderToConfirm: 'Confirm animal and quantity' },
        { label: 'Beads and clothing for the young woman', quantity: 1, unit: 'set', rateKey: null, founderToConfirm: 'Senior women to list' },
      ]},
      { phase: 'CELEBRATION', items: [
        { label: 'Singers and dancers (ukuxhentsa)', quantity: 4, unit: 'person', rateKey: 'singer_per_session', founderToConfirm: 'Confirm whether family members are paid' },
        { label: 'Guests’ food, plates and spoons', quantity: 1, unit: 'kit', rateKey: null },
      ]},
      { phase: 'CLOSING', items: [{ label: 'Record contributions (Ukugida)', quantity: 1, unit: 'task', rateKey: null }]},
    ],
    questions: ['Which steps are public and which remain with women?', 'How long is the separation in your family?', 'What do the beads and clothing signify?'],
  },
  UMGQUPHUZO: {
    name: 'Umgquphuzo', english: 'Ceremony for a married woman at her original home', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'The founder confirms the name; purpose and sequence require local documentation.',
    phases: [
      { phase: 'PLANNING', items: [
        { label: 'Natal family sets the date and invites the married woman and her husband’s family', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Choose who will lead the family’s address', quantity: 1, unit: 'task', rateKey: null },
      ]},
      { phase: 'SUPPLIES', items: [
        { label: 'Animal for the ceremony', quantity: 1, unit: 'animal', rateKey: null, founderToConfirm: 'Confirm animal' },
        { label: 'Umqombothi', quantity: 6, unit: 'bhekile', rateKey: 'umqombothi_bhekile' },
        { label: 'Imphepho', quantity: 2, unit: 'bundle', rateKey: 'imphepho_bundle' },
        { label: 'Maize meal and relish', quantity: 1, unit: 'kit', rateKey: null },
      ]},
      { phase: 'CEREMONY_DAY', items: [{ label: 'Founder to provide the family-specific steps', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Write and approve the steps' }]},
    ],
    questions: ['What is its purpose?', 'When in married life is it done?', 'Who hosts and attends?'],
  },
  UKUZILA: {
    name: 'Ukuzila', english: 'Mourning period and family-defined closing', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Model mourning support separately from Ukubuyisa; closing rites and duration vary by family.',
    phases: [
      { phase: 'DURING_MOURNING', items: [
        { label: 'Elders explain the family’s mourning restrictions', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'List family-approved guidance' },
        { label: 'Mourning clothing', quantity: 1, unit: 'set', rateKey: null, founderToConfirm: 'Confirm what is worn and for how long' },
      ]},
      { phase: 'CLOSING_THE_MOURNING', items: [
        { label: 'Name and plan the family’s closing rite', quantity: 1, unit: 'task', rateKey: null, founderToConfirm: 'Confirm the local name and steps' },
        { label: 'Animal, drink and food if required by the family', quantity: 1, unit: 'kit', rateKey: null, founderToConfirm: 'Confirm before use' },
        { label: 'Elders and family gathering', quantity: 1, unit: 'task', rateKey: null },
      ]},
    ],
    questions: ['What is the closing rite called in your practice?', 'How long is the mourning period?', 'What differs for a widow or widower?'],
  },
  UMEMBESO_UMENDISO: {
    name: 'Umembeso / Umendiso', english: 'Wedding stages', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Stages and gift exchange vary; never imply a universal order or price lobola as a catalogue item.',
    phases: [
      { phase: 'LOBOLA', items: [
        { label: 'Families meet and agree the lobola arrangement', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Record agreed cattle or cash arrangement (not a standard app price)', quantity: 1, unit: 'family-agreed amount', rateKey: null, founderToConfirm: 'Never use the ordinary livestock rate as a lobola quote' },
      ]},
      { phase: 'UMEMBESO', items: [
        { label: 'Gifts exchanged between families', quantity: 1, unit: 'set', rateKey: null, founderToConfirm: 'Who gives what to whom' },
        { label: 'Blankets for the gift exchange', quantity: 4, unit: 'blanket', rateKey: 'blanket_plain', founderToConfirm: 'Confirm quantity' },
      ]},
      { phase: 'UMENDISO', items: [
        { label: 'Plan the bride’s send-off from her family home', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Animal for the ceremony', quantity: 1, unit: 'animal', rateKey: 'goat_standard', founderToConfirm: 'Confirm animal' },
        { label: 'Umqombothi', quantity: 10, unit: 'bhekile', rateKey: 'umqombothi_bhekile' },
        { label: 'Singers for the send-off', quantity: 4, unit: 'person', rateKey: 'singer_per_session' },
      ]},
      { phase: 'WEDDING_DAY', items: [{ label: 'Venue, food and drinks (link to the existing Wedding plan)', quantity: 1, unit: 'kit', rateKey: null }]},
    ],
    questions: ['What is the correct order in your family?', 'Who gives and receives umembeso?', 'Is umbondo part of your practice?'],
  },
  UMSINDLEKO: {
    name: 'Umsindleko', english: 'Meaning to be confirmed locally', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Do not publish the birth-thanksgiving meaning as general fact; published accounts also describe another context.',
    phases: [{ phase: 'PLANNING', items: [
      { label: 'Founder/community reviewer records the meaning and context', quantity: 1, unit: 'task', rateKey: null },
      { label: 'Only after confirmation, add family-specific supplies and steps', quantity: 1, unit: 'task', rateKey: null },
    ]}],
    questions: ['What does the term mean in your community?', 'Is it connected with childbirth, recovery, or another event?', 'Who may confirm the meaning?'],
  },
  UMHLONYANE: {
    name: 'Umhlonyane', english: 'Young woman’s first-menstruation rite', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Potentially overlaps with Intonjane; senior women must define whether it is separate in this community.',
    phases: [
      { phase: 'PLANNING_WOMEN_ELDERS', items: [{ label: 'Senior women decide whether this is distinct from Intonjane and set any steps', quantity: 1, unit: 'task', rateKey: null }]},
      { phase: 'SUPPLIES', items: [
        { label: 'Animal, if used in this family’s practice', quantity: 1, unit: 'animal', rateKey: null, founderToConfirm: 'Confirm whether an animal is used' },
        { label: 'Umqombothi', quantity: 6, unit: 'bhekile', rateKey: 'umqombothi_bhekile' },
        { label: 'Food for women and family', quantity: 1, unit: 'kit', rateKey: null },
      ]},
      { phase: 'CLOSING', items: [{ label: 'Record attendance if appropriate', quantity: 1, unit: 'task', rateKey: null }]},
    ],
    questions: ['Is it the same as Intonjane or a separate rite?', 'What does the family prepare?', 'Who attends?'],
  },
  UKUPHAHLA: {
    name: 'Ukuphahla', english: 'Offering to the ancestors', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Flexible family offering; drink, animal and sequence must not be compulsory defaults.',
    phases: [
      { phase: 'SMALL_OFFERING', items: [
        { label: 'Imphepho', quantity: 2, unit: 'bundle', rateKey: 'imphepho_bundle' },
        { label: 'Snuff (isidlo), if used', quantity: 1, unit: 'tin', rateKey: 'isidlo_snuff_tin', founderToConfirm: 'Confirm whether used' },
        { label: 'Umqombothi or brandy, as the family chooses', quantity: 1, unit: 'bottle', rateKey: null, founderToConfirm: 'Confirm drink' },
        { label: 'Elder speaks to the ancestors using family-approved names and praises', quantity: 1, unit: 'task', rateKey: null },
      ]},
      { phase: 'WITH_SLAUGHTER', items: [
        { label: 'Animal for the offering', quantity: 1, unit: 'animal', rateKey: null, founderToConfirm: 'Confirm animal and colour' },
        { label: 'Maize meal and relish', quantity: 1, unit: 'kit', rateKey: null },
        { label: 'Umqombothi for family', quantity: 6, unit: 'bhekile', rateKey: 'umqombothi_bhekile' },
      ]},
    ],
    questions: ['When is each size appropriate?', 'Which drink is offered?', 'Who may perform it?'],
  },
  INTLOMBE: {
    name: 'Intlombe', english: 'Healer’s drum-and-dance gathering', status: 'DRAFT_FOR_FOUNDER_REVIEW',
    basis: 'Represent as a standalone ceremony in the founder’s practice, with a link to Umsebenzi wegqirha where relevant.',
    phases: [
      { phase: 'PREPARATION', items: [
        { label: 'Igqirha confirms purpose and day', quantity: 1, unit: 'session', rateKey: 'igqirha_session', founderToConfirm: 'Negotiated service: collect three local quotes' },
        { label: 'Arrange a community space for the drum-and-dance circle', quantity: 1, unit: 'task', rateKey: null },
        { label: 'Drummers', quantity: 2, unit: 'person', rateKey: 'drummer_per_session', founderToConfirm: 'Collect three local quotes' },
        { label: 'Singers', quantity: 4, unit: 'person', rateKey: 'singer_per_session', founderToConfirm: 'Collect three local quotes' },
      ]},
      { phase: 'FOOD_AND_DRINK', items: [
        { label: 'Umqombothi', quantity: 10, unit: 'bhekile', rateKey: 'umqombothi_bhekile', founderToConfirm: 'Follow the igqirha’s instructions' },
        { label: 'Animal for the gathering', quantity: 1, unit: 'animal', rateKey: 'goat_white', founderToConfirm: 'Confirm locally' },
        { label: 'Maize meal', quantity: 1, unit: '50kg bag', rateKey: 'maize_meal_50kg' },
      ]},
    ],
    questions: ['Standalone ceremony or stage of Umsebenzi wegqirha in this community?', 'Who may attend?', 'Is the feast always a goat?'],
  },
});

export const DRAFT_CEREMONY_TYPE_NAMES = Object.freeze(Object.keys(DRAFT_CEREMONY_TYPES));
