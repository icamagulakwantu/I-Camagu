// How a checklist stage is named on screen. Ulwaluko uses the isiXhosa stage
// terms scholars use (umgeno, ubukhwetha, umphumo, ubukrwala), with umgidi as
// part of the same plan. Stages not listed fall back to their code in words.
export const PHASE_LABELS = {
  REGISTRATION: 'Umgeno · Registration and consent',
  TRANSPORT_ARRIVAL: 'Umgeno · Going to the mountain',
  PHYSICAL_PREPARATION: 'Umgeno · Preparing him',
  SPIRITUAL_ITEMS: 'Umgeno · Spiritual items',
  IBHOMA_CONSTRUCTION: 'Ubukhwetha · Building the ibhoma',
  DAILY_ESSENTIALS: 'Ubukhwetha · Daily essentials',
  DIET_EARLY_STAGE: 'Ubukhwetha · The first seven days',
  UMOJISO: 'Ubukhwetha · uMojiso',
  EXIT_PREPARATION: 'Umphumo · Coming out',
  IBHOMA_CLOSURE: 'Umphumo · Ukutshiswa kwebhoma',
  RETURN_HOME: 'Umphumo · Going home',
  ARRIVAL_INGQONGQO: 'Umgidi · Arrival and ingqongqo',
  KRAAL_SEATING: 'Umgidi · Ebuhlanti',
  ELDER_GUIDANCE: 'Umgidi · Ukuyala',
  COOKING_EBUHLANTI: 'Umgidi · Cooking ebuhlanti',
  COOKING_KITCHEN: 'Umgidi · The kitchen',
  HIERARCHY_ALLOCATION: 'Umgidi · Who brings what',
  ALCOHOL_DISTRIBUTION: 'Umgidi · Drinks',
  VIP_EKOYINI: 'Umgidi · The bar',
  CLOSURE: 'Umgidi · Closing',
  UBUKRWALA: 'Ubukrwala · The new man',
  FAMILY_SUGGESTIONS: 'Suggested by the family',
};

// The big stages of ulwaluko, in order, for the timeline.
export const ULWALUKO_STAGES = [
  ['UMGENO', 'Umgeno · Going in', ['REGISTRATION', 'TRANSPORT_ARRIVAL', 'PHYSICAL_PREPARATION', 'SPIRITUAL_ITEMS']],
  ['UBUKHWETHA', 'Ubukhwetha · On the mountain', ['IBHOMA_CONSTRUCTION', 'DAILY_ESSENTIALS', 'DIET_EARLY_STAGE', 'UMOJISO']],
  ['UMPHUMO', 'Umphumo · Coming out', ['EXIT_PREPARATION', 'IBHOMA_CLOSURE', 'RETURN_HOME']],
  ['UMGIDI', 'Umgidi · The homecoming', ['ARRIVAL_INGQONGQO', 'KRAAL_SEATING', 'ELDER_GUIDANCE', 'COOKING_EBUHLANTI', 'COOKING_KITCHEN', 'HIERARCHY_ALLOCATION', 'ALCOHOL_DISTRIBUTION', 'VIP_EKOYINI', 'CLOSURE']],
  ['UBUKRWALA', 'Ubukrwala · The new man', ['UBUKRWALA']],
];
