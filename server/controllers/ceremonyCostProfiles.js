// ============================================================================
// COST ESTIMATION CONSTANTS — Market rates (ZAR), updated periodically
// ============================================================================

const COST_RATES = {
  alcohol: {
    brandy_750ml: 180.00,
    gin_750ml: 220.00,
    whisky_750ml: 280.00,
    beer_case_24: 420.00,
    beer_bottle: 22.00,
    umqombothi_bhekile: 35.00,
    umqombothi_50l_drum: 850.00,
    wine_750ml: 120.00,
  },
  livestock: {
    male_ox_inkunzi: 18000.00,
    female_cow_inkomo: 16000.00,
    goat_white: 2500.00,
    goat_standard: 1800.00,
    sheep: 2200.00,
    sheep_with_horns: 2800.00,
    fowl: 120.00,
  },
  food: {
    maize_meal_50kg: 450.00,
    maize_meal_12_5kg: 120.00,
    rice_10kg: 180.00,
    cooking_oil_5l: 180.00,
    spinach_bundle: 25.00,
    cabbage_head: 18.00,
    potatoes_10kg: 120.00,
    onions_10kg: 80.00,
    green_apples_kg: 35.00,
    butter_500g: 85.00,
    salt_1kg: 18.00,
    sugar_10kg: 220.00,
  },
  supplies: {
    enamel_dish_large: 180.00,
    cast_iron_pot: 450.00,
    bhekile_can: 25.00,
    plastic_plate_pack_50: 85.00,
    plastic_spoon_pack_50: 45.00,
    blanket_white_striped: 350.00,
    blanket_plain: 280.00,
    grass_mat_ikhukho: 120.00,
    tarpaulin_sail: 280.00,
    poles_bundle: 350.00,
    firewood_bundle: 80.00,
    water_container_25l: 180.00,
    matches_box: 15.00,
    candles_pack: 35.00,
    lamp_paraffin: 85.00,
    dish_enamel: 45.00,
    cup_enamel: 25.00,
    spoon_metal: 15.00,
    axe: 280.00,
    knife_butcher: 120.00,
    cable_ties_pack: 35.00,
    cardboard_bedding: 80.00,
    imphepho_bundle: 45.00,
    ikoto_bentonite_kg: 65.00,
    amaphondo_beads_strand: 85.00,
    iintambo_cord_set: 120.00,
    ifutha_white_clay_pack: 55.00,
    intlabathi_ritual_ash: 0.00,
    isidlo_snuff_tin: 35.00,
  },
  transport: {
    bakkie_hire_day: 800.00,
    taxi_group: 600.00,
    fuel_round_trip: 650.00,
  },
  services: {
    igqirha_session: 1500.00,
    igqirha_graduation: 3500.00,
    drummer_per_session: 800.00,
    singer_per_session: 600.00,
  },
};

// ============================================================================
// CHECKLIST ARRAYS — Strictly isiXhosa, no Zulu contamination
// ============================================================================

const ULWALUKO_DEFAULT_ITEMS = [
  { phase: 'TRANSPORT_ARRIVAL', label: 'Arrange transport to the mountain' },
  { phase: 'TRANSPORT_ARRIVAL', label: 'Confirm elders/men accompanying' },
  { phase: 'PHYSICAL_PREPARATION', label: 'Head, facial, and pubic hair fully removed' },
  { phase: 'SPIRITUAL_ITEMS', label: 'Ikoto (bentonite clay)' },
  { phase: 'SPIRITUAL_ITEMS', label: 'Imphepho' },
  { phase: 'SPIRITUAL_ITEMS', label: 'Arrange uqiniswa komntwana (traditional healer)' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Ingubo (blanket)' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Sail/tarpaulin to cover ibhoma' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Poles for structure' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Cardboard for bedding base' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Axe, knife, wire/cable ties, firewood' },
  { phase: 'IBHOMA_CONSTRUCTION', label: 'Courtesy: a bottle of brandy and beers for the builders' },
  { phase: 'DAILY_ESSENTIALS', label: 'Dish, cup, spoon' },
  { phase: 'DAILY_ESSENTIALS', label: '25L water container' },
  { phase: 'DAILY_ESSENTIALS', label: 'Matches, lamp/candles' },
  { phase: 'DAILY_ESSENTIALS', label: 'A book' },
  { phase: 'DIET_EARLY_STAGE', label: 'No-salt food, steamed bread, spinach/cabbage' },
  { phase: 'DIET_EARLY_STAGE', label: 'Green apples and low-water-content fruit' },
  { phase: 'UMOJISO', label: 'Sheep (preferably with horns) for uMojiso' },
  { phase: 'UMOJISO', label: 'Minimum 4 bottles of brandy, 2 cases of beer (1 bottle for peers)' },
  { phase: 'EXIT_PREPARATION', label: 'Fresh white blanket with black stripes' },
  { phase: 'EXIT_PREPARATION', label: 'Correct type of butter (confirm with family)' },
  { phase: 'IBHOMA_CLOSURE', label: 'Courtesy: 1-2 bottles of brandy and beers for closure team' },
  { phase: 'RETURN_HOME', label: 'Arrange transport home' },
];

const UMGIDI_DEFAULT_ITEMS = [
  { phase: 'ARRIVAL_INGQONGQO', label: 'Arrange Ingqongqo (women beating zinc, chanting)' },
  { phase: 'ARRIVAL_INGQONGQO', label: 'Courtesy: bottle of gin and brandy for the women' },
  { phase: 'KRAAL_SEATING', label: 'Ikhukho for the ikrwala to sit on' },
  { phase: 'KRAAL_SEATING', label: 'Small black tree branch from the initiation site' },
  { phase: 'ELDER_GUIDANCE', label: 'Arrange elder men for zoku yala guidance' },
  { phase: 'ELDER_GUIDANCE', label: 'Courtesy: bottle and beers for the elders' },
  { phase: 'COOKING_EBUHLANTI', label: 'Livestock for slaughter (choose sheep or another household-approved protein source)' },
  { phase: 'COOKING_EBUHLANTI', label: '9+ large enamel dishes, 6 cast iron pots' },
  { phase: 'COOKING_EBUHLANTI', label: '10+ bhekile for umqombothi' },
  { phase: 'COOKING_KITCHEN', label: 'Arrange women for kitchen station (general food)' },
  { phase: 'COOKING_KITCHEN', label: 'Plastic plates and spoons for guests' },
  { phase: 'HIERARCHY_ALLOCATION', label: 'Set up the 14-group hierarchy allocations (see Hierarchy tool)' },
  { phase: 'ALCOHOL_DISTRIBUTION', label: 'Main distribution supplies (5-8 bottles, 1-2 cases per group)' },
  { phase: 'ALCOHOL_DISTRIBUTION', label: 'Ingxotha (final round) supplies' },
  { phase: 'VIP_EKOYINI', label: 'Book Ekoyini Mobile Bar for VIP/friends phase' },
  { phase: 'CLOSURE', label: 'Ukunxityiswa - new clothes and remaining alcohol for the next day' },
];

const INTAMBO_ENKULU_DEFAULT_ITEMS = [
  { phase: 'PLANNING_ELDERS', label: 'Convene family elders (Abadala bomzi) to confirm readiness for full ancestral binding' },
  { phase: 'PLANNING_ELDERS', label: 'Identify the lineage head who will perform Ukunqula and address the ancestors by name' },
  { phase: 'PLANNING_ELDERS', label: 'Formally request aunts (Oodade bobawo) and senior matriarchs to witness the binding' },
  { phase: 'PLANNING_ELDERS', label: 'Confirm the individual has undergone Imbeleko or equivalent first rite of passage' },
  { phase: 'PURPOSE_BINDING', label: 'Establish intent: Full ancestral recognition and binding (Ukubopheleleka) into the lineage' },
  { phase: 'PURPOSE_BINDING', label: 'Declare that this rite grants permission to enter Ekoyini, become Igwirha/Intlabi, and perform all rituals' },
  { phase: 'PURPOSE_BINDING', label: 'Set taboos (IzipALO) for the initiate during the binding period' },
  { phase: 'SUPPLIES_SACRED', label: 'Secure a white goat without blemish for the recognition slaughter' },
  { phase: 'SUPPLIES_SACRED', label: 'Gather white beads (Amaphondo) for the protective cord ceremony' },
  { phase: 'SUPPLIES_SACRED', label: 'Procure protective binding cords (Iintambo) from organic fibre as directed by elders' },
  { phase: 'SUPPLIES_SACRED', label: 'Prepare white clay (Ifutha) — NOT red ochre (Imbula) — for ritual marking' },
  { phase: 'SUPPLIES_SACRED', label: 'Collect ritual ash (Intlabathi) for ancestral invocation' },
  { phase: 'EXECUTION_RITUAL', label: 'Perform Ukuxhela: ritual throat-slitting of the goat by the lineage head at dawn' },
  { phase: 'EXECUTION_RITUAL', label: 'Collect blood in a traditional vessel for ancestral offering' },
  { phase: 'EXECUTION_RITUAL', label: 'Cut Intsonyama from the inside muscle of the right foreleg, roast without salt' },
  { phase: 'EXECUTION_RITUAL', label: 'Male kin eat Intsonyama first, then female kin, in strict order of seniority' },
  { phase: 'EXECUTION_RITUAL', label: 'Cook meat with water only — no salt, no spices — and consume before any other food' },
  { phase: 'BINDING_CORDS', label: 'Tie protective cords (Iintambo) around wrists/ankles while lineage head recites Ukunqula' },
  { phase: 'BINDING_CORDS', label: 'Affix white beads (Amaphondo) onto the cords as ancestral markers' },
  { phase: 'BINDING_CORDS', label: 'Apply Ifutha (white clay) markings to the initiate as seal of ancestral recognition' },
  { phase: 'BINDING_CORDS', label: 'Elders declare the individual now has full access to the Xhosa spiritual realm' },
  { phase: 'CLOSURE', label: 'Dispose of ritual remains outside the homestead as directed by elders' },
  { phase: 'CLOSURE', label: 'Instruct the newly bound individual on permanent taboos and responsibilities' },
  { phase: 'CLOSURE', label: 'Brew Umqombothi for the binding ceremony' },
  { phase: 'CLOSURE', label: 'Provide brandy and gin for elders and participants' },
];

const UKUKHAPHA_DEFAULT_ITEMS = [
  { phase: 'PLANNING_LINEAGE', label: 'Confirm the specific male ancestor being accompanied (Utatomkhulu, Utata, or Inkulu)' },
  { phase: 'PLANNING_LINEAGE', label: 'Assemble senior paternal uncles (Ootatomkhulu/Amalume) to map the deceased journey narration' },
  { phase: 'PLANNING_LINEAGE', label: 'Verify all attendees have undergone Intambo Enkulu before entering the kraal' },
  { phase: 'PURPOSE_TRANSITION', label: 'Establish intent: Accompanying the male spirit (Isithunzi) into the ancestral realm (Ezweni lamathongo)' },
  { phase: 'PURPOSE_TRANSITION', label: 'Brief family on strict behavioural taboos (IzipALO) — no loud celebrations, no fermented drink' },
  { phase: 'KRAAL_SACRIFICE', label: 'Select male cow (Inkunzi) for the head of household, or white goat for ordinary male ancestor' },
  { phase: 'KRAAL_SACRIFICE', label: 'NEVER use a female cow (Inkomo yomfazi) for a male ancestor — strictly forbidden' },
  { phase: 'KRAAL_SACRIFICE', label: 'Cleanse the centre of the kraal (Intshonalanga yebuhlanti) for beast processing' },
  { phase: 'KRAAL_SACRIFICE', label: 'Lay grass mats (Ikhukho) inside the kraal for officiating elders' },
  { phase: 'RITUAL_SLAUGHTER', label: 'Perform Ukuxhela at dawn — lineage head slaughters the male animal' },
  { phase: 'RITUAL_SLAUGHTER', label: 'Cut Intsonyama from the right foreleg inside muscle, roast without salt' },
  { phase: 'RITUAL_SLAUGHTER', label: 'Serve Intsonyama to male kin first, then female kin, by seniority' },
  { phase: 'RITUAL_SLAUGHTER', label: 'Cook all ritual meat with water only — no salt, no spices' },
  { phase: 'RITUAL_SLAUGHTER', label: 'Meat must be consumed outside the homestead before any other food is eaten' },
  { phase: 'ANCESTRAL_ADDRESS', label: 'Lineage head performs Ukunqula, naming the deceased and requesting safe passage' },
  { phase: 'ANCESTRAL_ADDRESS', label: 'Collect blood and Intlabathi for ancestral offering' },
  { phase: 'CLOSURE_RITUAL', label: 'Perform Ukuxukuxa cleansing with goat, sheep, or fowl before family disperses' },
  { phase: 'CLOSURE_RITUAL', label: 'Brew Umqombothi for the ceremony' },
  { phase: 'CLOSURE_RITUAL', label: 'Provide brandy and gin for elders and participants' },
];

const INKOBE_DEFAULT_ITEMS = [
  { phase: 'PLANNING_MATRIARCH', label: 'Confirm the female ancestor (Umama, Utatomkhulu womfazi, or Inkulu yomfazi)' },
  { phase: 'PLANNING_MATRIARCH', label: 'Invite maternal side (Abakwazala / OoMalume) and matriarchs (Abafazi bomzi) to lead' },
  { phase: 'PLANNING_MATRIARCH', label: 'This ceremony is performed ONCE ONLY for a female ancestor — there is no Ukubuyisa for females' },
  { phase: 'PURPOSE_TRANSITION', label: 'Establish intent: Accompanying the female spirit to the realm of the ancestors' },
  { phase: 'PURPOSE_TRANSITION', label: 'Gather daughters and daughters-in-law (Abakhotshi) to organise women-led sections' },
  { phase: 'KRAAL_SACRIFICE', label: 'Select female cow (Inkomo ensikeni / Inkomo yomfazi) — NEVER a male cow for a female ancestor' },
  { phase: 'KRAAL_SACRIFICE', label: 'Perform Ukuxhela at dawn under direction of senior matriarchs and paternal elders' },
  { phase: 'KRAAL_SACRIFICE', label: 'Cut Intsonyama from the right foreleg, roast without salt, serve by seniority' },
  { phase: 'KRAAL_SACRIFICE', label: 'Cook meat with water only — no salt, no spices' },
  { phase: 'INKOBE_PREP', label: 'Procure high-quality whole dry white maize kernels (Inkobe)' },
  { phase: 'INKOBE_PREP', label: 'Boil Inkobe in large cast iron pots until perfectly cooked' },
  { phase: 'INKOBE_PREP', label: 'Prepare grass-woven baskets (Iintsuba / Izithebe) or pristine enamel bowls for serving' },
  { phase: 'COMMUNAL_SHARING', label: 'Distribute ritual meat portions into enamel dishes by seniority' },
  { phase: 'COMMUNAL_SHARING', label: "Guests take handfuls of Inkobe as a sign of receiving the ancestor's blessings" },
  { phase: 'COMMUNAL_SHARING', label: 'Conclude with Izibongo (praise songs) honouring the maternal line' },
  { phase: 'CLOSURE', label: 'Brew Umqombothi for the ceremony' },
  { phase: 'CLOSURE', label: 'Provide brandy and gin for elders and participants' },
  { phase: 'CLOSURE', label: 'NO Ukubuyisa follows this rite — the female ancestor is not brought back; she remains in the ancestral realm' },
];

const UKUBUYISA_DEFAULT_ITEMS = [
  { phase: 'PLANNING_RETURN', label: 'Confirm the MALE ancestor whose spirit is mature enough to be brought home' },
  { phase: 'PLANNING_RETURN', label: 'Verify mourning period (Ukuzila) is complete — usually within one year' },
  { phase: 'PLANNING_RETURN', label: 'MALES ONLY — Ukubuyisa is NEVER performed for female ancestors in Xhosa tradition' },
  { phase: 'PURPOSE_ENTHRONEMENT', label: 'Establish intent: Bringing the male spirit home to brood over the family as guardian ancestor (Umkhulu)' },
  { phase: 'PURPOSE_ENTHRONEMENT', label: 'Prepare Ukunqula invocation prayers to welcome the ancestor back to the kraal' },
  { phase: 'SUPPLIES_LIVESTOCK', label: 'Procure male ox (Inkunzi) — male animal for male ancestor' },
  { phase: 'SUPPLIES_LIVESTOCK', label: 'NEVER use a female cow for Ukubuyisa — strictly forbidden' },
  { phase: 'KRAAL_WELCOME', label: 'Brew Umqombothi (50L to 100L) — this is a festive homecoming, fermented beer IS consumed' },
  { phase: 'KRAAL_WELCOME', label: 'Arrange Bhekile (traditional cans) for seamless serving of Umqombothi' },
  { phase: 'KRAAL_WELCOME', label: 'Set aside brandy and gin for elder men (modern courtesy)' },
  { phase: 'KRAAL_WELCOME', label: 'Prepare designated seating in the kraal (Ebuhlanti) by family hierarchy' },
  { phase: 'RITUAL_EXECUTION', label: 'Perform Ukuxhela on the male ox at dawn' },
  { phase: 'RITUAL_EXECUTION', label: 'Cut Intsonyama from the right foreleg, roast without salt, distribute by seniority' },
  { phase: 'RITUAL_EXECUTION', label: 'Cook celebratory meat in 6+ cast iron pots — some portions with salt for guests, ritual portions without' },
  { phase: 'RITUAL_EXECUTION', label: 'Lineage head performs Ukunqula calling the ancestor by name to return home' },
  { phase: 'RESTORATION_CLOSURE', label: 'Elder formally announces the ancestor is now Umkhulu — guardian seated at the kraal threshold' },
  { phase: 'RESTORATION_CLOSURE', label: 'Complete distribution of all remaining meat to extended family and neighbours — nothing is kept overnight' },
  { phase: 'RESTORATION_CLOSURE', label: 'Pour final libation of Umqombothi at the kraal gatepost for the ancestor' },
  { phase: 'RESTORATION_CLOSURE', label: 'Family may now invoke the ancestor by name in Imithandazo (prayers) and Imbeleko ceremonies' },
  { phase: 'RESTORATION_CLOSURE', label: 'Ukubuyisa is COMPLETE — the male ancestor now broods over the homestead permanently; never repeat for the same ancestor' },
];

const UMSEBENZI_WEGQIRHA_DEFAULT_ITEMS = [
  { phase: 'PLANNING_HEALER', label: 'Confirm the specific graduation stage with the practising Igqirha and fellow Amaqhirha' },
  { phase: 'PLANNING_HEALER', label: 'Verify the Igqirha has undergone Intambo Enkulu — prerequisite for all healer ceremonies' },
  { phase: 'PLANNING_HEALER', label: 'Confirm the ancestral dream (Iphupha) directing the specific ritual requirements' },
  { phase: 'PURPOSE_DANCE', label: 'Establish intent: Harmonising spiritual callings, ancestral alignment, and healing-path recognition' },
  { phase: 'PURPOSE_DANCE', label: 'Secure structural space for the drum-and-dance circle (Intlombe)' },
  { phase: 'SECLUSION_RIVER', label: 'Build reed seclusion hut (Ibhuma) by the river for Imfukamo overnight seclusion' },
  { phase: 'SECLUSION_RIVER', label: 'Place ritual items in the water for Abantu bomlambo — greet with "Camagu"' },
  { phase: 'SECLUSION_RIVER', label: 'Ancestor speaks during seclusion — observe all taboos strictly' },
  { phase: 'SECLUSION_RIVER', label: 'Destroy Ibhuma after seclusion is complete' },
  { phase: 'SUPPLIES_SACRED', label: 'Secure white goat without blemish as directed by the ancestral dream' },
  { phase: 'SUPPLIES_SACRED', label: 'Prepare white clay (Ifutha) for healer markings — NOT red ochre (Imbula)' },
  { phase: 'SUPPLIES_SACRED', label: 'Procure snuff (Isidlo / Isemfu) for spiritual protocols' },
  { phase: 'SUPPLIES_SACRED', label: 'Secure traditional leather drums (Ingqongqo / Amagomana) in working condition' },
  { phase: 'SUPPLIES_SACRED', label: 'Arrange trained drum beaters and singers versed in ancestral rhythms' },
  { phase: 'BREWING_INTLOMBE', label: 'Brew Umqombothi observing sacred purity instructions from the Igqirha' },
  { phase: 'BREWING_INTLOMBE', label: 'Serve Umqombothi in new billy can (Intsimbi emhlophe) — never used before' },
  { phase: 'BREWING_INTLOMBE', label: 'Secure courtesy gin, brandy, and matches for elder healers' },
  { phase: 'SLAUGHTER_FEAST', label: 'Perform Ukuxhela on the white goat' },
  { phase: 'SLAUGHTER_FEAST', label: 'Cut and distribute Intsonyama by healer seniority' },
  { phase: 'SLAUGHTER_FEAST', label: 'Cook meat in large pots for the feasting community' },
  { phase: 'SLAUGHTER_FEAST', label: 'Launch Intlombe: drum, sing, and dance through the night to celebrate graduation' },
];

const GENERIC_DEFAULT_ITEMS = [
  { phase: 'PLANNING', label: 'Set a date and guest estimate' },
  { phase: 'PLANNING', label: 'Set a budget' },
  { phase: 'SUPPLIES', label: 'Confirm meat/alcohol/livestock needs' },
  { phase: 'LOGISTICS', label: 'Arrange venue/space' },
];

// ============================================================================
// PER-CEREMONY COST PROFILES — Default quantities and unit assignments
// ============================================================================

const ULWALUKO_COST_PROFILE = {
  'TRANSPORT_ARRIVAL': [
    { label: 'Arrange transport to the mountain', category: 'transport', unit: 'trip', unitCost: COST_RATES.transport.bakkie_hire_day, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '1 bakkie' },
    { label: 'Confirm elders/men accompanying', category: 'supplies', unit: 'person', unitCost: 0, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 elders' },
  ],
  'PHYSICAL_PREPARATION': [
    { label: 'Head, facial, and pubic hair fully removed', category: 'services', unit: 'session', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'SPIRITUAL_ITEMS': [
    { label: 'Ikoto (bentonite clay)', category: 'supplies', unit: 'kg', unitCost: COST_RATES.supplies.ikoto_bentonite_kg, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2-3 kg', skuName: 'Ikoto (Bentonite Clay)' },
    { label: 'Imphepho', category: 'supplies', unit: 'bundle', unitCost: COST_RATES.supplies.imphepho_bundle, quantity: 3, isInputField: true, inputType: 'number', suggestedAmount: '3-5 bundles', skuName: 'Imphepho Bundle' },
    { label: 'Arrange uqiniswa komntwana (traditional healer)', category: 'services', unit: 'session', unitCost: COST_RATES.services.igqirha_session, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'R1,500 - R3,500' },
  ],
  'IBHOMA_CONSTRUCTION': [
    { label: 'Ingubo (blanket)', category: 'supplies', unit: 'blanket', unitCost: COST_RATES.supplies.blanket_plain, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 blankets', skuName: 'Plain Grey Blanket' },
    { label: 'Sail/tarpaulin to cover ibhoma', category: 'supplies', unit: 'sheet', unitCost: COST_RATES.supplies.tarpaulin_sail, quantity: 1, isInputField: true, inputType: 'number', skuName: 'Tarpaulin Sail' },
    { label: 'Poles for structure', category: 'supplies', unit: 'bundle', unitCost: COST_RATES.supplies.poles_bundle, quantity: 1, isInputField: true, inputType: 'number', skuName: 'Ibhoma Pole Bundle' },
    { label: 'Cardboard for bedding base', category: 'supplies', unit: 'bundle', unitCost: COST_RATES.supplies.cardboard_bedding, quantity: 2, isInputField: true, inputType: 'number' },
    { label: 'Axe, knife, wire/cable ties, firewood', category: 'supplies', unit: 'kit', unitCost: COST_RATES.supplies.axe + COST_RATES.supplies.knife_butcher + COST_RATES.supplies.cable_ties_pack + COST_RATES.supplies.firewood_bundle, quantity: 1, isInputField: true, inputType: 'number' },
    { label: 'Courtesy: a bottle of brandy and beers for the builders', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '1 brandy + 6 beers' },
  ],
  'DAILY_ESSENTIALS': [
    { label: 'Dish, cup, spoon', category: 'supplies', unit: 'set', unitCost: COST_RATES.supplies.dish_enamel + COST_RATES.supplies.cup_enamel + COST_RATES.supplies.spoon_metal, quantity: 1, isInputField: true, inputType: 'number' },
    { label: '25L water container', category: 'supplies', unit: 'container', unitCost: COST_RATES.supplies.water_container_25l, quantity: 2, isInputField: true, inputType: 'number', skuName: '25L Water Container' },
    { label: 'Matches, lamp/candles', category: 'supplies', unit: 'kit', unitCost: COST_RATES.supplies.matches_box + COST_RATES.supplies.lamp_paraffin, quantity: 1, isInputField: true, inputType: 'number' },
    { label: 'A book', category: 'supplies', unit: 'book', unitCost: 0, quantity: 1, isInputField: true, inputType: 'text', suggestedAmount: 'Bring a journal or religious text' },
  ],
  'DIET_EARLY_STAGE': [
    { label: 'No-salt food, steamed bread, spinach/cabbage', category: 'food', unit: 'weekly_groceries', unitCost: 450.00, quantity: 3, isInputField: true, inputType: 'number', suggestedAmount: 'R450/week x 3 weeks' },
    { label: 'Green apples and low-water-content fruit', category: 'food', unit: 'kg', unitCost: COST_RATES.food.green_apples_kg, quantity: 5, isInputField: true, inputType: 'number', suggestedAmount: '5 kg apples', skuName: 'Green Apples (per kg)' },
  ],
  'UMOJISO': [
    { label: 'Sheep (preferably with horns) for uMojiso', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.sheep_with_horns, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Sheep w/ horns ~R2,800', skuName: 'Sheep with Horns' },
    { label: 'Minimum 4 bottles of brandy, 2 cases of beer (1 bottle for peers)', category: 'alcohol', unit: 'mixed', unitCost: 0, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '4 brandy + 2 beer cases' },
  ],
  'EXIT_PREPARATION': [
    { label: 'Fresh white blanket with black stripes', category: 'supplies', unit: 'blanket', unitCost: COST_RATES.supplies.blanket_white_striped, quantity: 1, isInputField: true, inputType: 'number', skuName: 'White Blanket with Black Stripes' },
    { label: 'Correct type of butter (confirm with family)', category: 'food', unit: 'tub', unitCost: COST_RATES.food.butter_500g, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 x 500g tubs', skuName: 'Butter 500g' },
  ],
  'IBHOMA_CLOSURE': [
    { label: 'Courtesy: 1-2 bottles of brandy and beers for closure team', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 brandy + 12 beers' },
  ],
  'RETURN_HOME': [
    { label: 'Arrange transport home', category: 'transport', unit: 'trip', unitCost: COST_RATES.transport.bakkie_hire_day, quantity: 1, isInputField: true, inputType: 'number' },
  ],
};

const UMGIDI_COST_PROFILE = {
  'ARRIVAL_INGQONGQO': [
    { label: 'Arrange Ingqongqo (women beating zinc, chanting)', category: 'services', unit: 'group', unitCost: 0, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '8-12 women' },
    { label: 'Courtesy: bottle of gin and brandy for the women', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.gin_750ml + COST_RATES.alcohol.brandy_750ml, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '1 gin + 1 brandy' },
  ],
  'KRAAL_SEATING': [
    { label: 'Ikhukho for the ikrwala to sit on', category: 'supplies', unit: 'mat', unitCost: COST_RATES.supplies.grass_mat_ikhukho, quantity: 1, isInputField: true, inputType: 'number' },
    { label: 'Small black tree branch from the initiation site', category: 'supplies', unit: 'branch', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'ELDER_GUIDANCE': [
    { label: 'Arrange elder men for zoku yala guidance', category: 'services', unit: 'elder', unitCost: 0, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 elders' },
    { label: 'Courtesy: bottle and beers for the elders', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '1 brandy + 6 beers' },
  ],
  'COOKING_EBUHLANTI': [
    { label: 'Livestock for slaughter (choose sheep or another household-approved protein source)', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.sheep, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Sheep ~R2,200; quantity varies by household and guest count' },
    { label: '9+ large enamel dishes, 6 cast iron pots', category: 'supplies', unit: 'kit', unitCost: (COST_RATES.supplies.enamel_dish_large * 9) + (COST_RATES.supplies.cast_iron_pot * 6), quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Borrow or buy ~R4,300' },
    { label: '10+ bhekile for umqombothi', category: 'supplies', unit: 'can', unitCost: COST_RATES.supplies.bhekile_can, quantity: 12, isInputField: true, inputType: 'number', suggestedAmount: '12 cans' },
  ],
  'COOKING_KITCHEN': [
    { label: 'Arrange women for kitchen station (general food)', category: 'services', unit: 'person', unitCost: 0, quantity: 6, isInputField: true, inputType: 'number', suggestedAmount: '6-10 women' },
    { label: 'Plastic plates and spoons for guests', category: 'supplies', unit: 'guest_pack', unitCost: COST_RATES.supplies.plastic_plate_pack_50 + COST_RATES.supplies.plastic_spoon_pack_50, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '200 plates + 200 spoons' },
  ],
  'HIERARCHY_ALLOCATION': [
    { label: 'Set up the 14-group hierarchy allocations (see Hierarchy tool)', category: 'alcohol', unit: 'allocation', unitCost: 0, quantity: 14, isInputField: true, inputType: 'number', suggestedAmount: 'See alcohol distribution calculator' },
  ],
  'ALCOHOL_DISTRIBUTION': [
    { label: 'Main distribution supplies (5-8 bottles, 1-2 cases per group)', category: 'alcohol', unit: 'mixed', unitCost: 0, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Use alcohol distribution calculator' },
    { label: 'Ingxotha (final round) supplies', category: 'alcohol', unit: 'mixed', unitCost: 0, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '2-3 brandy + 1 beer case' },
  ],
  'VIP_EKOYINI': [
    { label: 'Book Ekoyini Mobile Bar for VIP/friends phase', category: 'services', unit: 'booking', unitCost: 2500.00, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'R2,500 - R5,000' },
  ],
  'CLOSURE': [
    { label: 'Ukunxityiswa - new clothes and remaining alcohol for the next day', category: 'supplies', unit: 'mixed', unitCost: 0, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Budget R2,000 - R4,000' },
  ],
};

const INTAMBO_ENKULU_COST_PROFILE = {
  'PLANNING_ELDERS': [
    { label: 'Convene family elders (Abadala bomzi) to confirm readiness for full ancestral binding', category: 'services', unit: 'elder', unitCost: 0, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 elders' },
    { label: 'Identify the lineage head who will perform Ukunqula and address the ancestors by name', category: 'services', unit: 'person', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Formally request aunts (Oodade bobawo) and senior matriarchs to witness the binding', category: 'services', unit: 'person', unitCost: 0, quantity: 3, isInputField: true, inputType: 'number', suggestedAmount: '3-5 aunts' },
    { label: 'Confirm the individual has undergone Imbeleko or equivalent first rite of passage', category: 'services', unit: 'check', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'PURPOSE_BINDING': [
    { label: 'Establish intent: Full ancestral recognition and binding (Ukubopheleleka) into the lineage', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Declare that this rite grants permission to enter Ekoyini, become Igwirha/Intlabi, and perform all rituals', category: 'services', unit: 'declaration', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Set taboos (IzipALO) for the initiate during the binding period', category: 'services', unit: 'session', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'SUPPLIES_SACRED': [
    { label: 'Secure a white goat without blemish for the recognition slaughter', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.goat_white, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'White goat ~R2,500' },
    { label: 'Gather white beads (Amaphondo) for the protective cord ceremony', category: 'supplies', unit: 'strand', unitCost: COST_RATES.supplies.amaphondo_beads_strand, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 strands' },
    { label: 'Procure protective binding cords (Iintambo) from organic fibre as directed by elders', category: 'supplies', unit: 'set', unitCost: COST_RATES.supplies.iintambo_cord_set, quantity: 1, isInputField: true, inputType: 'number' },
    { label: 'Prepare white clay (Ifutha) — NOT red ochre (Imbula) — for ritual marking', category: 'supplies', unit: 'pack', unitCost: COST_RATES.supplies.ifutha_white_clay_pack, quantity: 2, isInputField: true, inputType: 'number' },
    { label: 'Collect ritual ash (Intlabathi) for ancestral invocation', category: 'supplies', unit: 'collection', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'EXECUTION_RITUAL': [
    { label: 'Perform Ukuxhela: ritual throat-slitting of the goat by the lineage head at dawn', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Collect blood in a traditional vessel for ancestral offering', category: 'supplies', unit: 'vessel', unitCost: 0, quantity: 1, isInputField: true, inputType: 'text', suggestedAmount: 'Traditional clay pot or enamel basin' },
    { label: 'Cut Intsonyama from the inside muscle of the right foreleg, roast without salt', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Male kin eat Intsonyama first, then female kin, in strict order of seniority', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cook meat with water only — no salt, no spices — and consume before any other food', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'BINDING_CORDS': [
    { label: 'Tie protective cords (Iintambo) around wrists/ankles while lineage head recites Ukunqula', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Affix white beads (Amaphondo) onto the cords as ancestral markers', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Apply Ifutha (white clay) markings to the initiate as seal of ancestral recognition', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Elders declare the individual now has full access to the Xhosa spiritual realm', category: 'services', unit: 'declaration', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'CLOSURE': [
    { label: 'Dispose of ritual remains outside the homestead as directed by elders', category: 'services', unit: 'task', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Instruct the newly bound individual on permanent taboos and responsibilities', category: 'services', unit: 'session', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Brew Umqombothi (50L to 75L) for the binding ceremony', category: 'alcohol', unit: 'litre', unitCost: COST_RATES.alcohol.umqombothi_50l_drum / 50, quantity: 50, isInputField: true, inputType: 'number', suggestedAmount: '50-75 litres' },
    { label: 'Brandy and gin for elders and participants', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml + COST_RATES.alcohol.gin_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 brandy + 2 gin' },
  ],
};

const UKUKHAPHA_COST_PROFILE = {
  'PLANNING_LINEAGE': [
    { label: 'Confirm the specific male ancestor being accompanied (Utatomkhulu, Utata, or Inkulu)', category: 'services', unit: 'confirmation', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Assemble senior paternal uncles (Ootatomkhulu/Amalume) to map the deceased journey narration', category: 'services', unit: 'elder', unitCost: 0, quantity: 3, isInputField: true, inputType: 'number', suggestedAmount: '3-5 uncles' },
    { label: 'Verify all attendees have undergone Intambo Enkulu before entering the kraal', category: 'services', unit: 'check', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'PURPOSE_TRANSITION': [
    { label: 'Establish intent: Accompanying the male spirit (Isithunzi) into the ancestral realm (Ezweni lamathongo)', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Brief family on strict behavioural taboos (IzipALO) — no loud celebrations, no fermented drink', category: 'services', unit: 'briefing', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'KRAAL_SACRIFICE': [
    { label: 'Select male cow (Inkunzi) for the head of household, or white goat for ordinary male ancestor', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.male_ox_inkunzi, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Inkunzi ~R18,000 or goat ~R2,500' },
    { label: 'NEVER use a female cow (Inkomo yomfazi) for a male ancestor — strictly forbidden', category: 'livestock', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
    { label: 'Cleanse the centre of the kraal (Intshonalanga yebuhlanti) for beast processing', category: 'services', unit: 'task', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Lay grass mats (Ikhukho) inside the kraal for officiating elders', category: 'supplies', unit: 'mat', unitCost: COST_RATES.supplies.grass_mat_ikhukho, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 mats' },
  ],
  'RITUAL_SLAUGHTER': [
    { label: 'Perform Ukuxhela at dawn — lineage head slaughters the male animal', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cut Intsonyama from the right foreleg inside muscle, roast without salt', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Serve Intsonyama to male kin first, then female kin, by seniority', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cook all ritual meat with water only — no salt, no spices', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Meat must be consumed outside the homestead before any other food is eaten', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'ANCESTRAL_ADDRESS': [
    { label: 'Lineage head performs Ukunqula, naming the deceased and requesting safe passage', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Collect blood and Intlabathi for ancestral offering', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'CLOSURE_RITUAL': [
    { label: 'Perform Ukuxukuxa cleansing with goat, sheep, or fowl before family disperses', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.goat_standard, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Goat ~R1,800 or fowl ~R120' },
    { label: 'Brew Umqombothi (50L to 75L) for the ceremony', category: 'alcohol', unit: 'litre', unitCost: COST_RATES.alcohol.umqombothi_50l_drum / 50, quantity: 50, isInputField: true, inputType: 'number', suggestedAmount: '50-75 litres' },
    { label: 'Brandy and gin for elders and participants', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml + COST_RATES.alcohol.gin_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 brandy + 2 gin' },
  ],
};

const INKOBE_COST_PROFILE = {
  'PLANNING_MATRIARCH': [
    { label: 'Confirm the female ancestor (Umama, Utatomkhulu womfazi, or Inkulu yomfazi)', category: 'services', unit: 'confirmation', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Invite maternal side (Abakwazala / OoMalume) and matriarchs (Abafazi bomzi) to lead', category: 'services', unit: 'person', unitCost: 0, quantity: 6, isInputField: true, inputType: 'number', suggestedAmount: '6-10 women' },
    { label: 'This ceremony is performed ONCE ONLY for a female ancestor — there is no Ukubuyisa for females', category: 'services', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
  ],
  'PURPOSE_TRANSITION': [
    { label: 'Establish intent: Accompanying the female spirit to the realm of the ancestors', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Gather daughters and daughters-in-law (Abakhotshi) to organise women-led sections', category: 'services', unit: 'person', unitCost: 0, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-8 women' },
  ],
  'KRAAL_SACRIFICE': [
    { label: 'Select female cow (Inkomo ensikeni / Inkomo yomfazi) — NEVER a male cow for a female ancestor', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.female_cow_inkomo, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Inkomo ensikeni ~R16,000' },
    { label: 'Perform Ukuxhela at dawn under direction of senior matriarchs and paternal elders', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cut Intsonyama from the right foreleg, roast without salt, serve by seniority', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cook meat with water only — no salt, no spices', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'INKOBE_PREP': [
    { label: 'Procure high-quality whole dry white maize kernels (Inkobe)', category: 'food', unit: 'kg', unitCost: 28.00, quantity: 10, isInputField: true, inputType: 'number', suggestedAmount: '10-15 kg' },
    { label: 'Boil Inkobe in large cast iron pots until perfectly cooked', category: 'supplies', unit: 'pot', unitCost: COST_RATES.supplies.cast_iron_pot, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2-3 pots (borrowed)' },
    { label: 'Prepare grass-woven baskets (Iintsuba / Izithebe) or pristine enamel bowls for serving', category: 'supplies', unit: 'bowl', unitCost: COST_RATES.supplies.enamel_dish_large, quantity: 6, isInputField: true, inputType: 'number', suggestedAmount: '6-10 bowls' },
  ],
  'COMMUNAL_SHARING': [
    { label: 'Distribute ritual meat portions into enamel dishes by seniority', category: 'supplies', unit: 'dish', unitCost: COST_RATES.supplies.enamel_dish_large, quantity: 6, isInputField: true, inputType: 'number', suggestedAmount: '6-9 dishes' },
    { label: "Guests take handfuls of Inkobe as a sign of receiving the ancestor's blessings", category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Conclude with Izibongo (praise songs) honouring the maternal line', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'CLOSURE': [
    { label: 'Brew Umqombothi (50L to 75L) for the ceremony', category: 'alcohol', unit: 'litre', unitCost: COST_RATES.alcohol.umqombothi_50l_drum / 50, quantity: 50, isInputField: true, inputType: 'number', suggestedAmount: '50-75 litres' },
    { label: 'Brandy and gin for elders and participants', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml + COST_RATES.alcohol.gin_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 brandy + 2 gin' },
    { label: 'NO Ukubuyisa follows this rite — the female ancestor is not brought back; she remains in the ancestral realm', category: 'services', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
  ],
};

const UKUBUYISA_COST_PROFILE = {
  'PLANNING_RETURN': [
    { label: 'Confirm the MALE ancestor whose spirit is mature enough to be brought home', category: 'services', unit: 'confirmation', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Verify mourning period (Ukuzila) is complete — usually within one year', category: 'services', unit: 'check', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'MALES ONLY — Ukubuyisa is NEVER performed for female ancestors in Xhosa tradition', category: 'services', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
  ],
  'PURPOSE_ENTHRONEMENT': [
    { label: 'Establish intent: Bringing the male spirit home to brood over the family as guardian ancestor (Umkhulu)', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Prepare Ukunqula invocation prayers to welcome the ancestor back to the kraal', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'SUPPLIES_LIVESTOCK': [
    { label: 'Procure male ox (Inkunzi) — male animal for male ancestor', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.male_ox_inkunzi, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'Inkunzi ~R18,000' },
    { label: 'NEVER use a female cow for Ukubuyisa — strictly forbidden', category: 'livestock', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
  ],
  'KRAAL_WELCOME': [
    { label: 'Brew Umqombothi (50L to 100L) — this is a festive homecoming, fermented beer IS consumed', category: 'alcohol', unit: 'litre', unitCost: COST_RATES.alcohol.umqombothi_50l_drum / 50, quantity: 75, isInputField: true, inputType: 'number', suggestedAmount: '75-100 litres' },
    { label: 'Arrange Bhekile (traditional cans) for seamless serving of Umqombothi', category: 'supplies', unit: 'can', unitCost: COST_RATES.supplies.bhekile_can, quantity: 15, isInputField: true, inputType: 'number', suggestedAmount: '15-20 cans' },
    { label: 'Set aside brandy and gin for elder men (modern courtesy)', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.brandy_750ml + COST_RATES.alcohol.gin_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 brandy + 2 gin' },
    { label: 'Prepare designated seating in the kraal (Ebuhlanti) by family hierarchy', category: 'supplies', unit: 'mat', unitCost: COST_RATES.supplies.grass_mat_ikhukho, quantity: 8, isInputField: true, inputType: 'number', suggestedAmount: '8-12 mats' },
  ],
  'RITUAL_EXECUTION': [
    { label: 'Perform Ukuxhela on the male ox at dawn', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cut Intsonyama from the right foreleg, roast without salt, distribute by seniority', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cook celebratory meat in 6+ cast iron pots — some portions with salt for guests, ritual portions without', category: 'supplies', unit: 'pot', unitCost: COST_RATES.supplies.cast_iron_pot, quantity: 6, isInputField: true, inputType: 'number', suggestedAmount: '6 pots (borrowed or bought)' },
    { label: 'Lineage head performs Ukunqula calling the ancestor by name to return home', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'RESTORATION_CLOSURE': [
    { label: 'Elder formally announces the ancestor is now Umkhulu — guardian seated at the kraal threshold', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Complete distribution of all remaining meat to extended family and neighbours — nothing is kept overnight', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Pour final libation of Umqombothi at the kraal gatepost for the ancestor', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Family may now invoke the ancestor by name in Imithandazo (prayers) and Imbeleko ceremonies', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Ukubuyisa is COMPLETE — the male ancestor now broods over the homestead permanently; never repeat for the same ancestor', category: 'services', unit: 'warning', unitCost: 0, quantity: 0, isInputField: false },
  ],
};

const UMSEBENZI_WEGQIRHA_COST_PROFILE = {
  'PLANNING_HEALER': [
    { label: 'Confirm the specific graduation stage with the practising Igqirha and fellow Amaqhirha', category: 'services', unit: 'consultation', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Verify the Igqirha has undergone Intambo Enkulu — prerequisite for all healer ceremonies', category: 'services', unit: 'check', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Confirm the ancestral dream (Iphupha) directing the specific ritual requirements', category: 'services', unit: 'consultation', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'PURPOSE_DANCE': [
    { label: 'Establish intent: Harmonising spiritual callings, ancestral alignment, and healing-path recognition', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Secure structural space for the drum-and-dance circle (Intlombe)', category: 'services', unit: 'space', unitCost: 0, quantity: 1, isInputField: true, inputType: 'text', suggestedAmount: 'Venue arranged by community' },
  ],
  'SECLUSION_RIVER': [
    { label: 'Build reed seclusion hut (Ibhuma) by the river for Imfukamo overnight seclusion', category: 'supplies', unit: 'structure', unitCost: 0, quantity: 1, isInputField: true, inputType: 'text', suggestedAmount: 'Reeds and poles from riverbank' },
    { label: 'Place ritual items in the water for Abantu bomlambo — greet with "Camagu"', category: 'supplies', unit: 'offering', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Ancestor speaks during seclusion — observe all taboos strictly', category: 'services', unit: 'protocol', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Destroy Ibhuma after seclusion is complete', category: 'services', unit: 'task', unitCost: 0, quantity: 1, isInputField: false },
  ],
  'SUPPLIES_SACRED': [
    { label: 'Secure white goat without blemish as directed by the ancestral dream', category: 'livestock', unit: 'animal', unitCost: COST_RATES.livestock.goat_white, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: 'White goat ~R2,500' },
    { label: 'Prepare white clay (Ifutha) for healer markings — NOT red ochre (Imbula)', category: 'supplies', unit: 'pack', unitCost: COST_RATES.supplies.ifutha_white_clay_pack, quantity: 2, isInputField: true, inputType: 'number' },
    { label: 'Procure snuff (Isidlo / Isemfu) for spiritual protocols', category: 'supplies', unit: 'tin', unitCost: COST_RATES.supplies.isidlo_snuff_tin, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 tins' },
    { label: 'Secure traditional leather drums (Ingqongqo / Amagomana) in working condition', category: 'supplies', unit: 'set', unitCost: 0, quantity: 1, isInputField: true, inputType: 'text', suggestedAmount: 'Borrow or hire from community' },
    { label: 'Arrange trained drum beaters and singers versed in ancestral rhythms', category: 'services', unit: 'session', unitCost: COST_RATES.services.drummer_per_session + COST_RATES.services.singer_per_session, quantity: 1, isInputField: true, inputType: 'number', suggestedAmount: '1 drummer + 1 singer ~R1,400' },
  ],
  'BREWING_INTLOMBE': [
    { label: 'Brew Umqombothi observing sacred purity instructions from the Igqirha', category: 'alcohol', unit: 'litre', unitCost: COST_RATES.alcohol.umqombothi_50l_drum / 50, quantity: 50, isInputField: true, inputType: 'number', suggestedAmount: '50-75 litres' },
    { label: 'Serve Umqombothi in new billy can (Intsimbi emhlophe) — never used before', category: 'supplies', unit: 'can', unitCost: COST_RATES.supplies.bhekile_can, quantity: 1, isInputField: true, inputType: 'number' },
    { label: 'Secure courtesy gin, brandy, and matches for elder healers', category: 'alcohol', unit: 'bottle', unitCost: COST_RATES.alcohol.gin_750ml + COST_RATES.alcohol.brandy_750ml, quantity: 2, isInputField: true, inputType: 'number', suggestedAmount: '2 gin + 2 brandy' },
  ],
  'SLAUGHTER_FEAST': [
    { label: 'Perform Ukuxhela on the white goat', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cut and distribute Intsonyama by healer seniority', category: 'services', unit: 'ritual', unitCost: 0, quantity: 1, isInputField: false },
    { label: 'Cook meat in large pots for the feasting community', category: 'supplies', unit: 'pot', unitCost: COST_RATES.supplies.cast_iron_pot, quantity: 4, isInputField: true, inputType: 'number', suggestedAmount: '4-6 pots' },
    { label: 'Launch Intlombe: drum, sing, and dance through the night to celebrate graduation', category: 'services', unit: 'event', unitCost: 0, quantity: 1, isInputField: false },
  ],
};

// ============================================================================
// EXPORTS — Unified registry for the iCamagu calculator
// ============================================================================

export const CEREMONY_COST_PROFILES = {
  ULWALUKO: ULWALUKO_COST_PROFILE,
  UMGIDI: UMGIDI_COST_PROFILE,
  IMIGIDI: UMGIDI_COST_PROFILE,
  INTAMBO_ENKULU: INTAMBO_ENKULU_COST_PROFILE,
  UKUKHAPHA: UKUKHAPHA_COST_PROFILE,
  INKOBE: INKOBE_COST_PROFILE,
  INKOBE_ZIKA_MAMA: INKOBE_COST_PROFILE,
  UKUBUYISA: UKUBUYISA_COST_PROFILE,
  UMSEBENZI_WEGQIRHA: UMSEBENZI_WEGQIRHA_COST_PROFILE,
};

// Map ceremony types to their default checklist arrays
const DEFAULT_ITEMS_MAP = {
  ULWALUKO: ULWALUKO_DEFAULT_ITEMS,
  UMGIDI: UMGIDI_DEFAULT_ITEMS,
  IMIGIDI: UMGIDI_DEFAULT_ITEMS,
  INTAMBO_ENKULU: INTAMBO_ENKULU_DEFAULT_ITEMS,
  UKUKHAPHA: UKUKHAPHA_DEFAULT_ITEMS,
  INKOBE: INKOBE_DEFAULT_ITEMS,
  INKOBE_ZIKA_MAMA: INKOBE_DEFAULT_ITEMS,
  UKUBUYISA: UKUBUYISA_DEFAULT_ITEMS,
  UMSEBENZI_WEGQIRHA: UMSEBENZI_WEGQIRHA_DEFAULT_ITEMS,
};

export function getDefaultItemsForType(type) {
  return DEFAULT_ITEMS_MAP[type] || GENERIC_DEFAULT_ITEMS;
}

export default CEREMONY_COST_PROFILES;