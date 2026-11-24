// Honest prices (founder, 24 Nov 2026: users complain our prices are wrong;
// "we can't give a discount on a discount"; 62% off is not believable;
// Ponchos comes in 6s, not 12s).
//
// What was wrong:
// - Several "verified" shop prices were read off a special (a broadsheet or
//   catalogue promotion), so the group price, set just under them, sat on top
//   of a discount: a discount on a discount.
// - A few shop prices were not the same product (another brand, a deli
//   per-kg price, an online marketplace), which made the saving look huge.
// - Some group prices were below what the shops charge even on special.
//
// The rules from now on:
// - A shop price is the shops' REGULAR price for the same product and pack
//   (Checkers, Shoprite, Pick n Pay), never a special.
// - A group price is never below a special running in the shops right now
//   (the Tops at SPAR Eastern Cape flyer 23 Nov - 20 Dec 2026, the founder's
//   photo, and the Shoprite/Checkers specials seen on 24 Nov 2026).
// - Where we re-read the regular case price, the group price sits 5 to 15%
//   under it until a supplier quotes.
// - The store never shows a saving above 25% (skuVisibility.js): above that
//   the price needs checking, so no saving is claimed.
// Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'honest-prices-2026-11-24';
const CHECKED = new Date('2026-11-24T12:00:00Z');
const r2 = (n) => Math.round(n * 100) / 100;

// Regular case prices read on 24 Nov 2026 (Checkers/Shoprite product pages).
// [name, bottleFormat, { retail, note, toFormat? }]
export const REGULAR = [
  ['Windhoek Draught', 'Can (440ml)', { retail: 434.99, toFormat: 'NRB (440ml)', note: 'Shoprite, Windhoek Premium Draught 24 x 440ml bottles R434.99 (Checkers R454.99). The 440ml is a bottle; the can is 500ml.' }],
  ['Heineken', 'Can (500ml)', { retail: 469.99, note: 'Checkers, Heineken 24 x 500ml cans R469.99; R25.99 a can' }],
  ['Heineken', 'Dumpy (330ml)', { retail: 389.99, note: 'Checkers, Heineken 24 x 330ml box R389.99 (Shoprite R409.99)' }],
  ['Castle Lite', 'Can (500ml)', { retail: 389.99, note: 'Shoprite and Checkers, Castle Lite 24 x 500ml cans R389.99' }],
  ['Castle Lager', 'Can (500ml)', { retail: 359.99, note: 'Shoprite, Castle Lager 24 x 500ml cans R359.99' }],
  ['Castle Lager', 'Quart (750ml)', { retail: 275.88, note: 'Checkers, Castle Lager 750ml R22.99 a bottle, x 12' }],
  ['Savanna Dry', 'Dumpy (330ml)', { retail: 459.99, note: 'Shoprite and Checkers, Savanna Dry 24 x 330ml R459.99' }],
  ['Black Label', 'Can (500ml)', { retail: 389.99, note: 'Checkers, Carling Black Label 24 x 500ml cans R389.99' }],
  ['Black Label', 'Quart (750ml)', { retail: 274.99, note: 'Checkers, Carling Black Label 12 x 750ml R274.99' }],
  ['Hansa Pilsener', 'Quart (750ml)', { retail: 259.99, note: 'Shoprite and Checkers, Hansa Pilsener 12 x 750ml R259.99' }],
  ['Flying Fish Lemon', 'Dumpy (330ml)', { retail: 339.99, note: 'Shoprite and Checkers, Flying Fish Pressed Lemon 24 x 330ml R339.99' }],
  ['Amstel Lager', 'Can (500ml)', { retail: 399.99, note: 'Checkers, Amstel Lager 24 x 500ml cans R399.99' }],
  ['Castle Milk Stout', 'Can (500ml)', { retail: 389.99, note: 'Checkers, Castle Milk Stout 24 x 500ml cans R389.99' }],
  ['Ponchos Tequila Coffee', '750ml Bottle', { retail: 2039.94, note: 'Shoprite, Ponchos Coffee Tequila 750ml R339.99, x 6 (sold in cases of 6)' }],
];

// The lowest special in the shops right now, per bottle or can. A group
// price is never below it. [name, bottleFormat or null for every pack, rand
// per unit, where]
const TOPS = 'Tops at SPAR Eastern Cape, 23 Nov - 20 Dec 2026';
export const SPECIAL_FLOORS = [
  ['Johnnie Walker Red Label', '750ml Bottle', 249.99, `${TOPS}: R249.99`],
  ['Jameson Original Irish', '750ml Bottle', 359.99, `${TOPS}: R359.99`],
  ['Jagermeister Herbal Liqueur', '750ml Bottle', 319.99, `${TOPS}: R319.99`],
  ['Amarula Original Cream', '750ml Bottle', 164.99, `${TOPS}: R164.99`],
  ['Captain Morgan Spiced Gold', '750ml Bottle', 174.99, `${TOPS}: R174.99`],
  ['Robertson Chapel Red', '1.5L Bottle', 89.99, `${TOPS}: R89.99`],
  ['Heineken', 'Can (500ml)', 16.25, 'Shoprite, Heineken 6 x 500ml any 2 for R195'],
  ['Windhoek Draught', 'NRB (440ml)', 17.08, `${TOPS}: 24 x 440ml R409.99`],
  ['Savanna Dry', 'Dumpy (330ml)', 16.67, `${TOPS}: 12 x 330ml R199.99`],
  ['Black Label', 'Can (500ml)', 13.75, 'Shoprite, Black Label 6 x 500ml 2 for R165'],
  ['Castle Lite', 'Can (500ml)', 13.75, 'Shoprite, Castle Lite 6 x 500ml any 2 for R165'],
  ['Castle Lite', 'Dumpy (330ml)', 13.61, `${TOPS}: 6 x 330ml any 3 for R245`],
  ['Flying Fish Lemon', 'Dumpy (330ml)', 13.61, `${TOPS}: 6 x 330ml any 3 for R245`],
  ['Stella Artois', 'Dumpy (330ml)', 13.61, `${TOPS}: 6 x 330ml any 3 for R245`],
  ['Brutal Fruit Ruby Apple', 'Dumpy (275ml)', 13.61, `${TOPS}: 6 x 275ml any 3 for R245`],
  ['Brutal Fruit Strawberry Rouge', 'Dumpy (275ml)', 13.61, `${TOPS}: 6 x 275ml any 3 for R245`],
  ['Belgravia Gin & Tonic', 'Can (440ml)', 20.0, `${TOPS}: 6 x 440ml any 2 for R240`],
  ['Belgravia Gin & Dry Lemon', 'Can (440ml)', 20.0, `${TOPS}: 6 x 440ml any 2 for R240`],
  ['Belgravia Gin & Dark Cherry', 'Can (440ml)', 20.0, `${TOPS}: 6 x 440ml any 2 for R240`],
  // Ponchos sells at R272 on special (KWV's own shop): no group price below it.
  ['Ponchos Tequila Coffee', '750ml Bottle', 272.0, "KWV shop special R272"],
  ['Ponchos Blanco Tequila', '750ml Bottle', 272.0, 'Priced as Ponchos Coffee (KWV shop special R272)'],
  ['Ponchos Caramel Tequila', '750ml Bottle', 272.0, 'Priced as Ponchos Coffee (KWV shop special R272)'],
];

// "Verified" shop prices that are not a regular price for the same product.
const PROMO_NOTE = /PROMOTIONAL|broadsheet|Prestons Liquors catalogue|Econo Foods catalogue|promo w\/|down from/i;
export const NOT_LIKE_FOR_LIKE = [
  ['Valpre Sparkling Water', 'Bottle (1L)', 'online marketplace price, not a shelf price'],
  ['Burger Patties', 'Box of 20 x 90g', 'the shop price was another brand'],
  ['Ham & Tongue Loaf', '2kg Loaf', 'the shop price was a deli per-kg price'],
  ['French Polony', '3kg Loaf', 'the shop price was three 1kg loaves'],
  ['Bernini Ruby Berry', null, 'no source recorded'],
];

const demote = (reason, note) => ({
  retailPriceSource: 'ESTIMATE',
  retailPriceNote: `Not shown as a shop price (24 Nov 2026): ${reason}.${note ? ` Was: ${String(note).slice(0, 200)}` : ''}`,
});

export async function makePricesHonest() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { skipped: true };
  const log = { cases: 0, regular: 0, demoted: 0, floored: 0 };

  // 1. Ponchos comes in cases of 6: same price a bottle, half the case.
  const ponchos = await prisma.sku.findMany({ where: { name: { startsWith: 'Ponchos' }, unitsPerCase: 12, retiredAt: null } });
  for (const p of ponchos) {
    await prisma.sku.update({ where: { id: p.id }, data: {
      unitsPerCase: 6,
      casePriceZAR: p.casePriceZAR == null ? null : r2(Number(p.casePriceZAR) / 2),
      retailPriceZAR: p.retailPriceZAR == null ? null : r2(Number(p.retailPriceZAR) / 2),
    } });
    log.cases += 1;
  }

  // 2. Shop prices that are a special, or not the same product, are no
  // longer shown; the group price is not left below that special.
  const regularKeys = new Set(REGULAR.map(([n, f]) => `${n}|${f}`));
  const verified = await prisma.sku.findMany({ where: { retiredAt: null, retailPriceSource: 'VERIFIED' } });
  for (const row of verified) {
    if (regularKeys.has(`${row.name}|${row.bottleFormat}`)) continue;
    const odd = NOT_LIKE_FOR_LIKE.find(([n, f]) => n === row.name && (f == null || f === row.bottleFormat));
    const promo = !odd && row.retailPriceNote && PROMO_NOTE.test(row.retailPriceNote) && !/regular/i.test(row.retailPriceNote);
    if (!odd && !promo) continue;
    const data = demote(odd ? odd[2] : 'it was a special, not the regular shelf price', row.retailPriceNote);
    // Never below that special: the special is what anyone could pay.
    if (promo && row.casePriceZAR != null && row.retailPriceZAR != null && Number(row.casePriceZAR) < Number(row.retailPriceZAR)) {
      data.casePriceZAR = Number(row.retailPriceZAR);
    }
    await prisma.sku.update({ where: { id: row.id }, data });
    log.demoted += 1;
  }

  // 3. Regular case prices re-read today; group price 5-15% under them.
  for (const [name, fmt, { retail, note, toFormat }] of REGULAR) {
    const row = await prisma.sku.findFirst({ where: { name, bottleFormat: fmt, retiredAt: null } });
    if (!row) continue;
    const data = { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: CHECKED, retailPriceNote: `24 Nov 2026 (regular price): ${note}` };
    if (toFormat && !(await prisma.sku.findFirst({ where: { name, bottleFormat: toFormat } }))) data.bottleFormat = toFormat;
    const bulk = row.casePriceZAR == null ? null : Number(row.casePriceZAR);
    const low = r2(retail * 0.85);
    const high = Math.floor(retail * 0.95 * 100) / 100;
    data.casePriceZAR = bulk == null ? r2(retail * 0.9) : Math.min(high, Math.max(low, bulk));
    await prisma.sku.update({ where: { id: row.id }, data });
    log.regular += 1;
  }

  // 4. No group price below a special running in the shops right now.
  for (const [name, fmt, perUnit, where] of SPECIAL_FLOORS) {
    const rows = await prisma.sku.findMany({ where: { name, bottleFormat: fmt, retiredAt: null, casePriceZAR: { not: null } } });
    for (const row of rows) {
      const floor = r2(perUnit * row.unitsPerCase);
      if (Number(row.casePriceZAR) >= floor) continue;
      const retail = row.retailPriceSource === 'VERIFIED' && row.retailPriceZAR != null ? Number(row.retailPriceZAR) : null;
      // Below a verified regular price the 5% saving stays; if the special
      // leaves no room, the shop price is shown without a saving claim.
      await prisma.sku.update({ where: { id: row.id }, data: { casePriceZAR: floor } });
      if (retail != null && floor > Math.floor(retail * 0.95 * 100) / 100) {
        await prisma.sku.update({ where: { id: row.id }, data: demote(`a special (${where}) leaves no room under the shop price`, row.retailPriceNote) });
      }
      log.floored += 1;
    }
  }

  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Honest prices: ${log.cases} Ponchos case(s) to 6, ${log.demoted} special or unlike shop price(s) no longer shown, ${log.regular} regular price(s) re-read, ${log.floored} group price(s) raised to today's specials.`);
  return { ...log, skipped: false };
}
