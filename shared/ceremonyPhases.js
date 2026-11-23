// How a checklist stage is named on screen. Ulwaluko uses the isiXhosa stage
// terms scholars use (umgeno, ubukhwetha, umphumo, ubukrwala), with umgidi as
// part of the same plan. Stages not listed fall back to their code in words.
export const PHASE_LABELS = {
  // Ulwaluko, in the order of the journey (founder, 23 Nov 2026): his hair
  // is cut at home before the ibhoma is built, then he goes in; umgidi is
  // the one day he comes home, the last part of the journey.
  REGISTRATION: 'Umgeno · Registration and consent',
  PHYSICAL_PREPARATION: 'Umgeno · Preparing him at home',
  SPIRITUAL_ITEMS: 'Umgeno · Spiritual items',
  IBHOMA_CONSTRUCTION: 'Umgeno · Building the ibhoma',
  TRANSPORT_ARRIVAL: 'Umgeno · Going to the mountain',
  DAILY_ESSENTIALS: 'Ubukhwetha · Daily essentials',
  DIET_EARLY_STAGE: 'Ubukhwetha · The first seven days',
  UMOJISO: 'Ubukhwetha · uMojiso',
  EXIT_PREPARATION: 'Umphumo · Coming out',
  IBHOMA_CLOSURE: 'Umphumo · Ukutshiswa kwebhoma',
  RETURN_HOME: 'Umphumo · Going home',
  // Umgidi: one day, the day he comes home. What is made ready beforehand
  // comes first, then the day itself in the order it happens.
  HIERARCHY_ALLOCATION: 'Umgidi · Getting ready: the groups and where they sit',
  // What the family hires, added by the family from the hire plan.
  HIRE: 'Getting ready: what you hire (tent, chairs, kitchen)',
  VIP_EKOYINI: 'Umgidi · Getting ready: the bar',
  ALCOHOL_DISTRIBUTION: 'Umgidi · Getting ready: drinks for each group',
  COOKING_EBUHLANTI: 'Umgidi · Getting ready: ebuhlanti',
  COOKING_KITCHEN: 'Umgidi · Getting ready: the kitchen',
  ARRIVAL_INGQONGQO: 'Umgidi · On the day: he arrives, ingqongqo',
  KRAAL_SEATING: 'Umgidi · On the day: everyone in their place',
  ELDER_GUIDANCE: 'Umgidi · On the day: ukuyala and izipho',
  CLOSURE: 'Umgidi · Closing the day',
  UBUKRWALA: 'Ubukrwala · The new man',
  // Ukuphuthuma, the igqirha's calling (Mlisa 2009; see ceremonyCostProfiles).
  GQIRHA_UBIZO: 'Ubizo · The calling',
  GQIRHA_UKUVUMA: 'Ukuvuma ukufa · Accepting the calling',
  GQIRHA_UKUTHWASA: 'Ukuthwasa · The training',
  GQIRHA_UKUPHUMA: 'Ukuphuma · Coming out as igqirha',
  GQIRHA_UKUPHINDA: 'Ukuphinda indlela · Going back along the path',
  UKUCELA: 'Ukucela · Asking for her',
  LOBOLA: 'Ilobola · The negotiations',
  WEDDING_PLANNING: 'Planning',
  WEDDING_SUPPLIERS: 'Food, dress and suppliers',
  WEDDING_FINAL: 'The final week',
  WEDDING_DAY: 'The wedding',
  AFTER_WEDDING: 'After the wedding',
  MOURNING: 'Ukuzila · Mourning',
  MOURNING_END: 'Ukukhulula izila · End of mourning',
  ANIMAL_AND_OFFERING: 'The goat and the offering',
  FOOD_AND_DRINK: 'Food and drink',
  CEREMONY_DAY: 'On the day',
  PLANNING_WOMEN_ELDERS: 'The senior women lead',
  PREPARATION: 'Preparing',
  CELEBRATION: 'Welcoming her back',
  FAMILY_SUGGESTIONS: 'Suggested by the family',
};

// The big stages of ulwaluko, in order, for the timeline.
export const ULWALUKO_STAGES = [
  ['UMGENO', 'Umgeno · Going in', ['REGISTRATION', 'PHYSICAL_PREPARATION', 'SPIRITUAL_ITEMS', 'IBHOMA_CONSTRUCTION', 'TRANSPORT_ARRIVAL']],
  ['UBUKHWETHA', 'Ubukhwetha · On the mountain', ['DAILY_ESSENTIALS', 'DIET_EARLY_STAGE', 'UMOJISO']],
  ['UMPHUMO', 'Umphumo · Coming out', ['EXIT_PREPARATION', 'IBHOMA_CLOSURE', 'RETURN_HOME']],
  ['UMGIDI', 'Umgidi · The day he comes home', ['HIERARCHY_ALLOCATION', 'HIRE', 'VIP_EKOYINI', 'ALCOHOL_DISTRIBUTION', 'COOKING_EBUHLANTI', 'COOKING_KITCHEN', 'ARRIVAL_INGQONGQO', 'KRAAL_SEATING', 'ELDER_GUIDANCE', 'CLOSURE']],
  ['UBUKRWALA', 'Ubukrwala · The new man', ['UBUKRWALA']],
];

// Each ceremony's stages in the order they happen. A plan's list follows
// this order (the journey), not the order the stages fall due: umgidi is
// prepared weeks ahead, but it is still the last part of ulwaluko.
export const PHASE_SEQUENCES = {
  ULWALUKO: ULWALUKO_STAGES.flatMap(([, , phases]) => phases),
  UMGIDI: ULWALUKO_STAGES.find(([key]) => key === 'UMGIDI')[2],
  WEDDING: ['UKUCELA', 'LOBOLA', 'WEDDING_PLANNING', 'HIRE', 'WEDDING_SUPPLIERS', 'WEDDING_FINAL', 'WEDDING_DAY', 'AFTER_WEDDING'],
  INTAMBO_ENKULU: ['PLANNING_ELDERS', 'HIRE', 'PURPOSE_BINDING', 'SUPPLIES_SACRED', 'EXECUTION_RITUAL', 'BINDING_CORDS', 'CLOSURE'],
  UKUKHAPHA: ['PLANNING_LINEAGE', 'PURPOSE_TRANSITION', 'HIRE', 'KRAAL_SACRIFICE', 'ANCESTRAL_ADDRESS', 'RITUAL_SLAUGHTER', 'CLOSURE_RITUAL', 'MOURNING', 'MOURNING_END'],
  INKOBE: ['PLANNING_MATRIARCH', 'PURPOSE_TRANSITION', 'HIRE', 'INKOBE_PREP', 'KRAAL_SACRIFICE', 'COMMUNAL_SHARING', 'CLOSURE'],
  UKUBUYISA: ['PLANNING_RETURN', 'PURPOSE_ENTHRONEMENT', 'SUPPLIES_LIVESTOCK', 'HIRE', 'KRAAL_WELCOME', 'RITUAL_EXECUTION', 'RESTORATION_CLOSURE'],
  UMSEBENZI_WEGQIRHA: ['GQIRHA_UBIZO', 'GQIRHA_UKUVUMA', 'GQIRHA_UKUTHWASA', 'HIRE', 'GQIRHA_UKUPHUMA', 'GQIRHA_UKUPHINDA'],
  IMBELEKO: ['PLANNING', 'HIRE', 'ANIMAL_AND_OFFERING', 'FOOD_AND_DRINK', 'CEREMONY_DAY', 'CLOSING'],
  INTONJANE: ['PLANNING_WOMEN_ELDERS', 'PREPARATION', 'HIRE', 'CELEBRATION', 'CLOSING'],
  GENERAL: ['PLANNING', 'HIRE', 'SUPPLIES', 'LOGISTICS'],
};

// One rank for every stage that keeps every ceremony's order at once: a
// stage comes after everything that comes before it in any ceremony. (A
// name such as CLOSURE ends several ceremonies, so each list alone is not
// enough.) Stages no ceremony lists have no rank.
function rankPhases(sequences) {
  const rank = new Map();
  for (let pass = 0; pass < 50; pass += 1) {
    let changed = false;
    for (const sequence of sequences) {
      sequence.forEach((phase, index) => {
        const after = index === 0 ? 0 : rank.get(sequence[index - 1]) + 1;
        if (!rank.has(phase) || rank.get(phase) < after) { rank.set(phase, after); changed = true; }
      });
    }
    if (!changed) return rank;
  }
  throw new Error('Ceremony stage orders contradict each other');
}
export const PHASE_RANK = rankPhases(Object.values(PHASE_SEQUENCES));
