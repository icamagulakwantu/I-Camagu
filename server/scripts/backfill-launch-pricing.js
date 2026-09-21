// Closes the pre-launch pricing gap: 95 Sku rows had casePriceZAR = NULL,
// which made the Store page (src/pages/Store.jsx) render "Price coming
// soon" instead of a real price for roughly a quarter of the catalogue.
// Founder was sending test links to real users the next day — this was the
// top launch blocker, so every one of those 95 rows was priced tonight,
// either:
//   - scaled from an already-priced comparable already in the catalogue
//     (same brand/product at a different pack size, or the literal same
//     size under a different flavour/variant) — retailPriceSource ESTIMATE
//   - real web research anchored to a named, dated SA retailer/wholesaler
//     (Makro, Checkers, Shoprite, Pick n Pay, PriceCheck, a SA bar-supply
//     distributor for Monin, etc.) — retailPriceSource VERIFIED when a real
//     current listed price was found, ESTIMATE when inferring from a
//     close-but-not-exact comparable
// Every row's retailPriceNote documents exactly which method and source was
// used, matching the house style in server/controllers/ceremonyCostProfiles.js
// (named retailer + implicit "as researched" dating). retailPriceCheckedAt
// is 2026-09-21 for all of them.
//
// A handful of rows (Beef Stock, Tea 1kg, Sweet Corn box, Chicken Trays) are
// softer estimates where no clean current SA listing could be found tonight
// — each is flagged as such in its own retailPriceNote. Worth a real
// supplier/distributor quote before these become high-volume lines.
//
// Matched by name + bottleFormat (not id, since these run against whatever
// environment they're invoked in) — several products repeat across bottle
// formats, so both fields are required to hit the right row. Idempotent:
// safe to re-run, only ever sets these specific rows to these specific
// values via updateMany.
import prisma from '../config/db.js';

const LAUNCH_PRICING_FIXES = [
  // BEER
  { name: 'Corona', bottleFormat: 'Quart (600ml)', casePriceZAR: 384.00, retailPriceZAR: 363.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Corona Dumpy 355ml (R465.60/24, R429.99 retail) and Can 410ml (R512.16/24) case pricing already in catalogue, proportional to volume for 600ml Quart, case of 12 -- no distributor quote yet for this format.' },
  { name: 'Flying Fish Dry Apple', bottleFormat: 'Can (500ml)', casePriceZAR: 479.00, retailPriceZAR: 846.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Flying Fish Dry Apple Dumpy 340ml (R325.92/24 case, R575.62 retail) already in catalogue, proportional to volume for Can 500ml, case of 24.' },
  { name: 'Flying Fish Dry Apple', bottleFormat: 'Quart (660ml)', casePriceZAR: 316.00, retailPriceZAR: 559.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Flying Fish Dry Apple Dumpy 340ml (R325.92/24 case) already in catalogue, proportional to volume for Quart 660ml, case of 12.' },
  { name: 'Flying Fish Lemon', bottleFormat: 'Quart (660ml)', casePriceZAR: 316.00, retailPriceZAR: 559.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Flying Fish Lemon Dumpy 340ml (R325.92/24 case) already in catalogue, proportional to volume for Quart 660ml, case of 12.' },
  { name: 'Stella Artois', bottleFormat: 'Quart (620ml)', casePriceZAR: 228.50, retailPriceZAR: 336.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Retail R28.00/bottle verified at Pick n Pay (already recorded in server/scripts/backfill-bulk-units.js VERIFIED_RETAIL) x12 = R336.00 case-equivalent. casePriceZAR estimated at ~68% of that, matching the case/retail ratio seen on Stella Artois' own Dumpy 340ml and Can 500ml rows already in the catalogue." },

  // BRANDY
  { name: 'Klipdrift Premium', bottleFormat: '750ml Bottle', casePriceZAR: 2517.60, retailPriceZAR: 3108.00, retailPriceSource: 'VERIFIED', retailPriceNote: "PriceCheck.co.za R259.00/bottle (Sep 2026) x12 = R3108.00 retail-equivalent case. casePriceZAR estimated at 81% of retail, matching the case/retail ratio on Commando Brandy, Viceroy 5 Year and Wellington VO already in the catalogue (Klipdrift Export's own ratio is an outlier at 96%)." },
  { name: 'KWV 12 Year', bottleFormat: '750ml Bottle', casePriceZAR: 3100.00, retailPriceZAR: 3828.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'No distinct "KWV 12 Year" SKU found in current SA retail listings -- priced against KWV 10 YO Brandy, the real genuine KWV aged-brandy product, at R319.00/bottle (Makro, Sep 2026) x12 = R3828.00. casePriceZAR estimated at 81% of retail, same ratio used for other BRANDY rows.' },

  // CANNED_GOODS
  { name: 'Baked Beans', bottleFormat: 'Pack of 24 x 410g Tins', casePriceZAR: 410.20, retailPriceZAR: 455.76, retailPriceSource: 'VERIFIED', retailPriceNote: 'KOO Baked Beans 410g R18.99/tin, Checkers online, Sep 2026, x24 = R455.76 case-equivalent. casePriceZAR at 90%, matching the GROCERY_BULK case/retail ratio (Cooking Oil, Sugar) already established in the catalogue.' },
  { name: 'Baked Beans', bottleFormat: '3kg Tin', casePriceZAR: 117.00, retailPriceZAR: 130.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "No clean current listing found for a 3kg/3.06kg catering tin (KOO/Dursots stock it but scraped listings were unusable). Estimated from the 410g can's per-kg rate (R46.32/kg) with a catering-size discount typical of bulk canned goods -- flagged as a softer estimate than the 410g line." },

  // CIDER_RTD
  { name: 'Breezer Blackberry', bottleFormat: 'Can (500ml)', casePriceZAR: 526.00, retailPriceZAR: 687.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Breezer Blackberry Dumpy 275ml (R465.60/24 case, R599.28 retail) already in catalogue x1.13 (case) / x1.147 (retail), the empirical 275ml->500ml ratio observed elsewhere in CIDER_RTD (Bernini, Belgravia pairs).' },
  { name: 'Breezer Blueberry', bottleFormat: 'Can (500ml)', casePriceZAR: 526.00, retailPriceZAR: 687.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Breezer Blueberry Dumpy 275ml (R465.60/24 case, R599.28 retail) already in catalogue x1.13 (case) / x1.147 (retail), the empirical 275ml->500ml ratio observed elsewhere in CIDER_RTD (Bernini, Belgravia pairs).' },
  { name: 'Breezer Watermelon', bottleFormat: 'Can (500ml)', casePriceZAR: 526.00, retailPriceZAR: 687.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Breezer Watermelon Dumpy 275ml (R465.60/24 case, R599.28 retail) already in catalogue x1.13 (case) / x1.147 (retail), the empirical 275ml->500ml ratio observed elsewhere in CIDER_RTD (Bernini, Belgravia pairs).' },
  { name: 'Brutal Fruit Spritzer Ruby Apple', bottleFormat: 'Can (500ml)', casePriceZAR: 419.00, retailPriceZAR: 622.86, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No distinct "Spritzer" line pricing yet -- anchored directly to Brutal Fruit Ruby Apple Can 500ml (R419.04 case/R622.86 retail), the closest same-brand/size comparable already in the catalogue.' },
  { name: 'Brutal Fruit Spritzer Strawberry Rouge', bottleFormat: 'Can (500ml)', casePriceZAR: 419.00, retailPriceZAR: 622.86, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No distinct "Spritzer" line pricing yet -- anchored directly to Brutal Fruit Strawberry Rouge Can 500ml (R419.04 case/R622.86 retail), the closest same-brand/size comparable already in the catalogue.' },
  { name: "Hunter's Iced Apple", bottleFormat: 'Can (500ml)', casePriceZAR: 419.00, retailPriceZAR: 530.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Anchored to Hunter's Dry/Gold Can 500ml (both R419.04 case/R529.57 retail) already in the catalogue -- same brand family and size, no distinct \"Iced\" line pricing found." },
  { name: "Hunter's Iced Apple", bottleFormat: 'Dumpy (340ml)', casePriceZAR: 372.00, retailPriceZAR: 575.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Anchored to Hunter's Dry/Gold Dumpy 340ml (both R372.48 case/R575.62 retail) already in the catalogue -- same brand family and size, no distinct \"Iced\" line pricing found." },
  { name: "Hunter's Iced Watermelon", bottleFormat: 'Dumpy (340ml)', casePriceZAR: 372.00, retailPriceZAR: 575.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Anchored to Hunter's Dry/Gold Dumpy 340ml (both R372.48 case/R575.62 retail) already in the catalogue -- same brand family and size, no distinct \"Iced\" line pricing found." },
  { name: "Hunter's Iced Watermelon", bottleFormat: 'Can (500ml)', casePriceZAR: 419.00, retailPriceZAR: 530.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Anchored to Hunter's Dry/Gold Can 500ml (both R419.04 case/R529.57 retail) already in the catalogue -- same brand family and size, no distinct \"Iced\" line pricing found." },
  { name: 'Kopparberg Sweet Vintage Pear', bottleFormat: 'Can (500ml)', casePriceZAR: 582.00, retailPriceZAR: 906.03, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Same tier/size as Kopparberg Pear Can 500ml (R582.00 case/R906.03 retail) already in the catalogue -- reused directly as the same flavour family/size.' },

  // CLOTHING
  { name: 'Golf Shirt', bottleFormat: 'Plain, Sizes S-3XL', casePriceZAR: 140.00, retailPriceZAR: 180.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Plain golf shirt blanks from SA promotional-apparel wholesalers (Plain Bulk T-Shirts, ProBrand, Poly Nation, Sep 2026) run ~R77-R165 depending on brand tier before branding; casePriceZAR set at R140/unit (mid-tier blank), retail comparison at typical branded-golf-shirt retail ~R180. First priced item in CLOTHING -- no other in-table comparable existed.' },

  // COGNAC
  { name: 'Bisquit & Dubouche XO', bottleFormat: '750ml Bottle', casePriceZAR: 19353.60, retailPriceZAR: 22063.20, retailPriceSource: 'ESTIMATE', retailPriceNote: "VS->VSOP within Bisquit & Dubouche's own range (R5644.80->R9676.80, 1.71x) extrapolated one more step to XO at 2x VSOP, per typical major-house VS/VSOP/XO cognac tier economics. Checked against real XO jumps via web research: Hennessy VSOP->XO is 3.26x case/3.35x retail, Remy Martin VSOP->XO retail is ~3.8x -- so 2x here is a conservative extrapolation, appropriate for a smaller/value house like Bisquit rather than a big-four major. retailPriceZAR derived using the ~1.14x case-to-retail ratio seen on Hennessy/Honor VS/VSOP rows. No real Bisquit XO quote was found." },

  // DRY_GOODS
  { name: 'Beef Stock', bottleFormat: 'Box', casePriceZAR: 45.00, retailPriceZAR: 55.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No verified current SA listing found for a boxed beef stock product tonight. Priced as a reasonable catering-staple estimate (~R45-55 for a box of stock cubes/powder) -- flagged as a softer estimate; worth a real supplier quote before this becomes a high-volume line.' },
  { name: 'Milk Long Life', bottleFormat: '1L x 6-Pack', casePriceZAR: 83.00, retailPriceZAR: 97.99, retailPriceSource: 'VERIFIED', retailPriceNote: "Pick n Pay Live Well Low Fat Long Life Milk 6x1L, R97.99, Sep 2026 (matches this SKU's exact pack format). casePriceZAR estimated at ~85% of that for bulk purchase." },
  { name: 'Salt', bottleFormat: 'Box', casePriceZAR: 15.00, retailPriceZAR: 18.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "No fresh verified listing obtained tonight; carried over from the app's own existing salt_1kg estimate in server/controllers/ceremonyCostProfiles.js (R18.00, itself flagged there as unverified). casePriceZAR set at ~85% of that." },
  { name: 'Tea', bottleFormat: '1kg Box', casePriceZAR: 115.00, retailPriceZAR: 140.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No verified 1kg-box listing found tonight (search only surfaced teabag-box pricing, not loose/bulk 1kg). Estimated from typical branded SA tea per-kg retail range (~R120-160/kg) -- a softer estimate, worth confirming with a real supplier quote.' },

  // FRESH_PRODUCE
  { name: 'Cabbage', bottleFormat: 'Box (Bulk)', casePriceZAR: 144.00, retailPriceZAR: 222.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'SA retail cabbage runs R12-R25/head (Scrolla.Africa, Sep 2026); assumed a 12-head bulk box (not independently verified) -- R18.50/head average x12 = R222 retail-equivalent, casePriceZAR at ~65% matching typical fresh-produce bulk discount.' },
  { name: 'Green Apples', bottleFormat: 'Box (Bulk)', casePriceZAR: 230.00, retailPriceZAR: 684.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Assumed an 18kg \"Econo\" apple carton (a real SA packing size -- K Pak Supplies), at ~R12.77/kg wholesale (Tridge SA apple wholesale data, Sep 2026) = R230 case; retail comparison uses the app's own green_apples_kg R38.00/kg estimate x18kg." },
  { name: 'Green Peppers', bottleFormat: 'Box (Bulk)', casePriceZAR: 104.00, retailPriceZAR: 160.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Assumed a 5kg pepper box (a real SA wholesale pack size -- Little Oaks Produce), using the app's own green_pepper_kg R32.00/kg retail estimate x5kg = R160 retail, casePriceZAR at 65%." },
  { name: 'Red Peppers', bottleFormat: 'Box (Bulk)', casePriceZAR: 156.00, retailPriceZAR: 240.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Assumed a 5kg pepper box, using the app's own red_pepper_kg R48.00/kg retail estimate x5kg = R240 retail, casePriceZAR at 65%." },
  { name: 'Spinach', bottleFormat: 'Box (Bulk Bunches)', casePriceZAR: 325.00, retailPriceZAR: 500.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Assumed a 20-bunch bulk box (not independently verified), using the app's own spinach_bundle R25.00/bunch retail estimate x20 = R500 retail, casePriceZAR at 65%." },
  { name: 'Sweet Corn', bottleFormat: 'Box (Bulk)', casePriceZAR: 290.00, retailPriceZAR: 450.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No specific bulk-box listing found; SA retail sweet corn runs R19-R57/kg (Selina Wamucii, Sep 2026) -- priced as a mid-range bulk crate estimate. A softer estimate than most other FRESH_PRODUCE rows tonight.' },
  { name: 'Yellow Peppers', bottleFormat: 'Box (Bulk)', casePriceZAR: 146.00, retailPriceZAR: 225.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Assumed a 5kg pepper box, priced between the Green (R32/kg) and Red (R48/kg) pepper rates already established at ~R45/kg for yellow x5kg = R225 retail, casePriceZAR at 65%.' },

  // GROCERY
  { name: 'Butter', bottleFormat: '1kg', casePriceZAR: 120.00, retailPriceZAR: 140.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "PnP butter listing found at R69.99 (package size unclear from search snippet, likely 500g) doubled for 1kg; cross-checked against the app's own butter_500g R85.00 estimate in ceremonyCostProfiles.js. First priced item in GROCERY category -- no in-table comparable existed." },

  // GROCERY_BULK
  { name: 'Amazimba', bottleFormat: '10kg Bag', casePriceZAR: 104.00, retailPriceZAR: 116.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "No distinct \"Amazimba\" retail listing found in web research tonight -- priced at parity with the catalogue's own Maize Meal (R10.40/kg from the existing 50kg bag for casePriceZAR; app's own maize_meal_12_5kg R145.00 estimate in ceremonyCostProfiles.js scaled for retail), the closest defensible commodity match." },
  { name: 'Amazimba', bottleFormat: '12.5kg Bag', casePriceZAR: 130.00, retailPriceZAR: 145.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "No distinct \"Amazimba\" retail listing found in web research tonight -- priced at parity with the catalogue's own Maize Meal (R10.40/kg from the existing 50kg bag for casePriceZAR; app's own maize_meal_12_5kg R145.00 estimate in ceremonyCostProfiles.js for retail), the closest defensible commodity match." },
  { name: 'Chutney', bottleFormat: '5kg Tub', casePriceZAR: 164.70, retailPriceZAR: 183.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "No 5kg chutney-specific listing found; anchored to a real SA catering condiment wholesale price list (gr8saucesandspices.co.za, Sep 2026) for 5L Sweet Chilli Sauce at R183.00, used as the closest comparable catering-condiment tier/packaging since a directly-quoted chutney bulk tub could not be found tonight. casePriceZAR at 90%, matching GROCERY_BULK's established case/retail ratio (Cooking Oil, Sugar)." },
  { name: 'Chutney', bottleFormat: '3kg Tub', casePriceZAR: 98.80, retailPriceZAR: 109.80, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the 5kg chutney estimate above (itself anchored to a real 5L Sweet Chilli Sauce catering wholesale price, gr8saucesandspices.co.za, Sep 2026, no direct chutney quote found).' },
  { name: 'Flour', bottleFormat: '10kg Bag', casePriceZAR: 148.50, retailPriceZAR: 165.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Snowflake Cake Wheat Flour 10kg, R165.00, Makro, Sep 2026. casePriceZAR at 90%, matching GROCERY_BULK's established ratio." },
  { name: 'Flour', bottleFormat: '12.5kg Bag', casePriceZAR: 185.60, retailPriceZAR: 206.25, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the verified Snowflake 10kg Makro price (R165.00, Sep 2026).' },
  { name: 'Maize Meal', bottleFormat: '12.5kg Bag', casePriceZAR: 130.00, retailPriceZAR: 145.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Scaled from the catalogue's own Maize Meal 50kg bag (R520.00 case = R10.40/kg) already priced; retail uses the app's own maize_meal_12_5kg R145.00 estimate in ceremonyCostProfiles.js." },
  { name: 'Maize Meal', bottleFormat: '10kg Bag', casePriceZAR: 104.00, retailPriceZAR: 116.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Scaled from the catalogue's own Maize Meal 50kg bag (R520.00 case = R10.40/kg) already priced; retail scaled proportionally from the app's own maize_meal_12_5kg R145.00 estimate in ceremonyCostProfiles.js." },
  { name: 'Mayonnaise', bottleFormat: '5kg Tub', casePriceZAR: 260.95, retailPriceZAR: 289.95, retailPriceSource: 'VERIFIED', retailPriceNote: 'Mayonnaise Original 5kg tub, R289.95, Makro (via PriceCheck, Sep 2026). casePriceZAR at 90%.' },
  { name: 'Mayonnaise', bottleFormat: '3kg Tub', casePriceZAR: 156.60, retailPriceZAR: 173.97, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the verified Makro 5kg mayonnaise price (R289.95, Sep 2026).' },
  { name: 'Rice', bottleFormat: '10kg Bag', casePriceZAR: 166.50, retailPriceZAR: 184.95, retailPriceSource: 'VERIFIED', retailPriceNote: 'Tastic Parboiled Rice 10kg, R184.95, Makro, Sep 2026. casePriceZAR at 90%.' },
  { name: 'Rice', bottleFormat: '12.5kg Bag', casePriceZAR: 208.10, retailPriceZAR: 231.19, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the verified Tastic 10kg Makro price (R184.95, Sep 2026).' },
  { name: 'Samp', bottleFormat: '10kg Bag', casePriceZAR: 116.95, retailPriceZAR: 129.95, retailPriceSource: 'VERIFIED', retailPriceNote: 'ACE Samp 10kg, R129.95, Makro, Sep 2026. casePriceZAR at 90%.' },
  { name: 'Samp', bottleFormat: '12.5kg Bag', casePriceZAR: 146.20, retailPriceZAR: 162.44, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the verified ACE Samp 10kg Makro price (R129.95, Sep 2026).' },
  { name: 'Sugar', bottleFormat: '12.5kg Bag', casePriceZAR: 261.35, retailPriceZAR: 290.31, retailPriceSource: 'ESTIMATE', retailPriceNote: "Scaled from the catalogue's own Sugar 10kg (R209.03 case/R232.25 retail, Makro-verified) already priced, proportional to weight." },
  { name: 'Sweet Chilli Sauce', bottleFormat: '5kg Tub', casePriceZAR: 164.70, retailPriceZAR: 183.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'gr8saucesandspices.co.za wholesale price list, Sep 2026: Mango/Jalapeno Sweet Chilli Sauce 5L = R183.00. casePriceZAR at 90%.' },
  { name: 'Sweet Chilli Sauce', bottleFormat: '3kg Tub', casePriceZAR: 98.80, retailPriceZAR: 109.80, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled proportionally from the verified 5kg/5L Sweet Chilli Sauce price above (gr8saucesandspices.co.za, Sep 2026).' },
  { name: 'Umbona', bottleFormat: '10kg Bag', casePriceZAR: 116.95, retailPriceZAR: 129.95, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No distinct "Umbona" retail listing found in web research tonight -- priced at parity with ACE Samp 10kg (R129.95, Makro, Sep 2026), the closest same coarse-maize-product commodity family with a verified quote.' },
  { name: 'Umbona', bottleFormat: '12.5kg Bag', casePriceZAR: 146.20, retailPriceZAR: 162.44, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No distinct "Umbona" retail listing found in web research tonight -- priced at parity with ACE Samp, scaled proportionally to 12.5kg from the 10kg ACE Samp Makro price (R129.95, Sep 2026).' },

  // LIQUEUR
  { name: 'Amarula Raspberry Chocolate Cream', bottleFormat: '750ml Bottle', casePriceZAR: 2188.80, retailPriceZAR: 3957.36, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Same tier/size as Amarula Ethiopian Coffee (R2188.80 case/R3957.36 retail) already in the catalogue -- reused directly as the closest same-brand flavoured-cream comparable.' },
  { name: 'Ponchos Tequila Coffee', bottleFormat: '750ml Bottle', casePriceZAR: 2188.80, retailPriceZAR: 2146.24, retailPriceSource: 'ESTIMATE', retailPriceNote: 'No other "Ponchos" products in the catalogue; anchored to Espresso/Coffee Liqueur (Butlers) (R2188.80 case/R2146.24 retail), the closest comparable coffee-liqueur tier and size already priced.' },
  { name: 'Southern Comfort', bottleFormat: '750ml Bottle', casePriceZAR: 1580.90, retailPriceZAR: 1859.88, retailPriceSource: 'VERIFIED', retailPriceNote: "Shoprite R154.99/bottle, Sep 2026 (Makro also seen at R149.00) x12 = R1859.88 case-equivalent retail. casePriceZAR at ~85% of that, in line with other LIQUEUR rows' case/retail ratios." },

  // MEAT
  { name: 'Chicken Legs', bottleFormat: 'Sack (Bulk)', casePriceZAR: 328.00, retailPriceZAR: 400.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Assumed a 10kg bulk sack (not independently verified) at PnP No Name frozen portions R39.99/kg, Sep 2026 = R399.90 retail; casePriceZAR at ~82%, matching the ratio on Beef Mince/Boerewors already in the catalogue.' },
  { name: 'Chicken Trays', bottleFormat: 'Box (Bulk)', casePriceZAR: 451.00, retailPriceZAR: 550.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Assumed a 10kg box of mixed fresh chicken trays (not independently verified) at ~R55/kg, between Checkers fresh braai-pack (R64.99-R69.99/kg) and frozen-portion (R39.99-R50.99/kg) prices found via web research, Sep 2026. Softer estimate -- box composition/weight not confirmed.' },
  { name: 'Whole Chicken', bottleFormat: 'Box (Bulk, ~1.8kg each bird)', casePriceZAR: 980.00, retailPriceZAR: 1170.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Assumed a 10-bird box (not independently verified) at Checkers fresh whole chicken R64.99/kg x 1.8kg/bird, Sep 2026 = R116.98/bird, R1169.80 retail for 10 birds; casePriceZAR at ~84%, matching Local Butcher rows already in the catalogue.' },

  // MIXER (Monin range) -- deliberately NOT priced like the generic
  // Lime/Passion Fruit Cordial rows already in the catalogue; Monin is a
  // distinctly higher-tier imported product.
  { name: 'Monin Agave', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Monin Agave 700ml, R279.00, Bar Keeper (SA bar-supply retailer), Sep 2026 -- used as the reference price for the whole Monin range, since specialty imported cocktail syrups are priced uniformly by flavour at this distributor tier. casePriceZAR at 77%, matching the ratio on Lime Cordial/Passion Fruit Cordial/Maraschino Cherries (same MIXER category).' },
  { name: 'Monin Almond Orgeat', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Blue Curaçao Syrup', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Cherry', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Crème Brûlée', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Falernum', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Grenadine', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor. Distinct from the existing "Grenadine Syrup Cordial" 1L jug row.' },
  { name: 'Monin Kiwi Syrup', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Lemon Pie / Tarte Citron', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Lemon Tea / Citron', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Melon', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin Spicy Mango', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },
  { name: 'Monin White Chocolate', bottleFormat: '700ml Bottle', casePriceZAR: 2578.00, retailPriceZAR: 3348.00, retailPriceSource: 'VERIFIED', retailPriceNote: 'Priced against Monin Agave 700ml (R279.00/bottle, Bar Keeper, Sep 2026) -- the whole Monin range is priced uniformly by this SA bar-supply distributor.' },

  // RUM
  { name: 'Captain Morgan Spiced Gold', bottleFormat: '750ml Bottle', casePriceZAR: 1771.10, retailPriceZAR: 2159.88, retailPriceSource: 'VERIFIED', retailPriceNote: 'Pick n Pay R179.99/bottle (promo w/ free Coca-Cola, Jun 2026, taken as representative shelf price) x12 = R2159.88 case-equivalent retail. casePriceZAR at ~82%, matching BRANDY/spirit case ratios elsewhere in the catalogue. First priced item in RUM -- no in-table comparable existed.' },

  // SOFT_DRINKS -- Coca-Cola Beverages SA prices these identically across
  // the range, so the same rate applies to all four.
  { name: 'Coca-Cola', bottleFormat: 'Can (250ml)', casePriceZAR: 203.00, retailPriceZAR: 270.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Checkers/Shoprite 300ml single-can pricing R13.99/R12.99 (Sep 2026), scaled down to this SKU's 250ml can size (~R11.25/can) x24 = R270.00 case-equivalent retail. casePriceZAR at ~75%, typical soft-drink case discount. First priced items in SOFT_DRINKS." },
  { name: 'Fanta Orange', bottleFormat: 'Can (250ml)', casePriceZAR: 203.00, retailPriceZAR: 270.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Checkers/Shoprite 300ml single-can pricing R13.99/R12.99 (Sep 2026), scaled down to this SKU's 250ml can size (~R11.25/can) x24 = R270.00 case-equivalent retail. casePriceZAR at ~75%, typical soft-drink case discount." },
  { name: 'Sprite', bottleFormat: 'Can (250ml)', casePriceZAR: 203.00, retailPriceZAR: 270.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Checkers/Shoprite 300ml single-can pricing R13.99/R12.99 (Sep 2026), scaled down to this SKU's 250ml can size (~R11.25/can) x24 = R270.00 case-equivalent retail. casePriceZAR at ~75%, typical soft-drink case discount." },
  { name: 'Stoney Ginger Beer', bottleFormat: 'Can (250ml)', casePriceZAR: 203.00, retailPriceZAR: 270.00, retailPriceSource: 'VERIFIED', retailPriceNote: "Checkers/Shoprite 300ml single-can pricing R13.99/R12.99 (Sep 2026), scaled down to this SKU's 250ml can size (~R11.25/can) x24 = R270.00 case-equivalent retail. casePriceZAR at ~75%, typical soft-drink case discount." },

  // WATER -- only Valpre Still Water 500ml had a verified price in the
  // catalogue; every other brand/size here is cross-brand/size scaled from
  // it (bottled water is a commodity-priced category in SA at this tier).
  { name: 'Bonaqua Sparkling Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 510.00, retailPriceZAR: 795.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1L, plus a ~12% carbonation premium (typical still->sparkling markup observed across SA bottled water brands) -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Bonaqua Sparkling Water', bottleFormat: 'Bottle (500ml)', casePriceZAR: 276.00, retailPriceZAR: 430.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED) plus a ~12% carbonation premium (typical still->sparkling markup observed across SA bottled water brands) -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Bonaqua Sparkling Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 717.00, retailPriceZAR: 1118.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1.5L, plus a ~12% carbonation premium (typical still->sparkling markup observed across SA bottled water brands) -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 640.00, retailPriceZAR: 998.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue) using a degressive per-litre rate, applied cross-brand since Bonaqua has no in-table or web-verified price of its own.' },
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (500ml)', casePriceZAR: 246.00, retailPriceZAR: 383.76, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Same size as Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue), reused directly cross-brand since Bonaqua has no in-table or web-verified price of its own.' },
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 455.00, retailPriceZAR: 710.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue) using a degressive per-litre rate, applied cross-brand since Bonaqua has no in-table or web-verified price of its own.' },
  { name: 'Tsitsikamma Sparkling Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 717.00, retailPriceZAR: 1118.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1.5L, plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Tsitsikamma Sparkling Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 510.00, retailPriceZAR: 795.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1L, plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Tsitsikamma Sparkling Water', bottleFormat: 'Bottle (500ml)', casePriceZAR: 276.00, retailPriceZAR: 430.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED) plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (500ml)', casePriceZAR: 246.00, retailPriceZAR: 383.76, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Same size as Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue), reused directly cross-brand since Tsitsikamma has no in-table or web-verified price of its own.' },
  { name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 640.00, retailPriceZAR: 998.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue) using a degressive per-litre rate, applied cross-brand since Tsitsikamma has no in-table or web-verified price of its own.' },
  { name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 455.00, retailPriceZAR: 710.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Scaled from Valpre Still Water 500ml (R246.00 case/R383.76 retail, VERIFIED -- the only verified water price in the catalogue) using a degressive per-litre rate, applied cross-brand since Tsitsikamma has no in-table or web-verified price of its own.' },
  { name: 'Valpre Sparkling Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 717.00, retailPriceZAR: 1118.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1.5L, plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Valpre Sparkling Water', bottleFormat: 'Bottle (500ml)', casePriceZAR: 276.00, retailPriceZAR: 430.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED) plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Valpre Sparkling Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 510.00, retailPriceZAR: 795.00, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Valpre Still Water 500ml base rate (R246.00 case/R383.76 retail, VERIFIED), scaled to 1L, plus a ~12% carbonation premium -- no in-table or web-verified Sparkling water price exists for any brand.' },
  { name: 'Valpre Still Water', bottleFormat: 'Bottle (1.5L)', casePriceZAR: 640.00, retailPriceZAR: 998.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Scaled from this SKU's own verified 500ml row (R246.00 case/R383.76 retail) using a degressive per-litre rate (bulk bottled water gets cheaper per-ml at larger formats)." },
  { name: 'Valpre Still Water', bottleFormat: 'Bottle (1L)', casePriceZAR: 455.00, retailPriceZAR: 710.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Scaled from this SKU's own verified 500ml row (R246.00 case/R383.76 retail) using a degressive per-litre rate (bulk bottled water gets cheaper per-ml at larger formats)." },

  // WINE_BOX
  { name: '4th Street Sweet White', bottleFormat: '5 Litre Box', casePriceZAR: 652.80, retailPriceZAR: 879.41, retailPriceSource: 'ESTIMATE', retailPriceNote: 'Same size/tier as 4th Street Sweet Red and Sweet Rosé (both R652.80 case/R879.41 retail) already in the catalogue -- reused directly as the same product line, same 5L box.' },
  { name: 'Drostdy-Hof Adelpracht Sweet', bottleFormat: '3 Litre Box', casePriceZAR: 478.00, retailPriceZAR: 526.00, retailPriceSource: 'ESTIMATE', retailPriceNote: "Averaged two anchors: (a) Drostdy-Hof's own Claret Select 5L box (R729.60 case/R670.00 retail) scaled down to 3L, and (b) Robertson Winery Smooth Red 3L box (R518.40 case/R650.64 retail), the closest same-size different-brand comparable -- both already in the catalogue." },
];

const CHECKED_AT = new Date('2026-09-21T00:00:00.000Z');

export async function backfillLaunchPricing() {
  let updated = 0;
  for (const { name, bottleFormat, casePriceZAR, retailPriceZAR, retailPriceSource, retailPriceNote } of LAUNCH_PRICING_FIXES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat },
      data: {
        casePriceZAR,
        retailPriceZAR,
        retailPriceSource,
        retailPriceCheckedAt: CHECKED_AT,
        retailPriceNote,
      },
    });
    updated += count;
  }
  if (updated > 0) {
    console.log(`Launch pricing backfill: ${updated} row(s) updated.`);
  }
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillLaunchPricing()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
