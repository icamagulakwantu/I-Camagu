# SmartMatch catalogue image coverage audit — 28 October 2026

## Scope

This is a repository-level static audit of `docs/pricing/skus_clean.tsv`, `server/scripts/backfill-extracted-brand-photos.js`, and files under `public/images/brands/`. It does **not** read the live production database or inspect every image's visual contents.

## Findings

- SKU rows in the TSV: **294**
- Distinct product names in the TSV: **214**
- Local files under `public/images/brands/`: **278**
- Explicit product-name mappings in `backfill-extracted-brand-photos.js`: **190**
- Mapping entries pointing to a missing local file: **0**
- Distinct TSV names without an obvious exact-name image mapping or simple slug match: **69**

The last number is a **review queue, not proof that all 69 live products have no image**. The TSV contains bundled/legacy names, and the live catalogue can contain renamed or split SKUs. A read-only live SKU export is needed to distinguish genuine missing images from legacy aliases.

## High-priority genuine coverage candidates

These catalogue names need explicit SKU-to-image review. Do not automatically assign an image based only on a similar brand name.

### Everyday groceries and fresh produce
- Baked Beans 410g Tin
- Brown Bread Loaf
- Flour 2.5kg
- Instant Coffee 750g
- Milk 2L
- Peanut Butter 400g
- Tea 100 Bags
- Cabbage Head
- Carrots 10kg
- Green Apples (per kg)
- Green Peppers (per kg)
- Onions 10kg
- Potatoes 10kg
- Red Peppers (per kg)
- Spinach Bundle
- Butter 500g
- Cooking Oil 5L
- Maize Meal 50kg
- Sugar 10kg
- Coca-Cola 300ml Can
- Fanta Orange 300ml Can
- Sprite 300ml Can
- Stoney Ginger Beer 300ml Can
- Valpre Still Water 500ml

### Meat, livestock and ceremony/non-consumables
- Cow / Ox (Inkunzi)
- Goat (Standard)
- Sheep with Horns
- Beef Mince 5kg
- Boerewors 5kg
- Whole Chicken (~1.8kg)
- Ikoto (Bentonite Clay)
- Imphepho Bundle
- 25L Water Container
- Ibhoma Pole Bundle
- Plain Grey Blanket
- Tarpaulin Sail
- White Blanket with Black Stripes

### Alcohol/mixers requiring alias or variant reconciliation
- Windhoek Lager/Light
- Belgravia G&T (Asstd)
- Bernini Classic/Blush/Ruby
- Breezer (Red/Watermelon)
- Brutal Fruit Ruby/Litchi
- Hunter's Dry/Gold
- Redd's Berry/Orig/Green
- Redd's MXD Pine/Guarana
- Savanna Dry/Light
- Smirnoff Spin/Storm
- Remy Martin 1738 Accord Royal
- Inverroche Amber/Verdant
- Kwande Gin
- Blue Curacao Generic
- Drambuie Honey/Scotch
- Peach Schnapps (Butlers)
- Peach Schnapps Generic
- Sambuca Generic Blue/White
- Strawberry Liqueur Generic
- Triple Sec Premium (San Basile)
- Lime/Passion Fruit Cordial
- Maraschino Cherries (Syrup)
- Krone Borealis Brut (MCC)
- Aljimardo Silver
- El Jimador Blanco/Reposado
- Ponchos Blanco/Caramel Tequila
- Ciroc (Apple/Mango/Pineapple)
- Chivas Regal 12 Year Old
- Jack Daniel's Tennessee Honey
- 4th Street Sweet Red/White
- Saint Raphael Sweet Red
- 4th Street Sweet Red/Rose

## Soft-drink pack-size conflict found on 28 October

The same four SKU IDs have conflicting pack descriptions across checked-in sources:

- `server/scripts/grocery-sku-catalog.csv` describes Coca-Cola, Fanta Orange, Sprite and Stoney as **250ml cans x24**.
- `docs/pricing/skus_clean.tsv` describes those same SKU IDs as **300ml cans**.
- The live startup image mapper matched **zero** 300ml rows on its first run, confirming the 300ml assumption does not match the current live records.

Do not change the product formats or prices automatically. The image repair now assigns the 300ml product photo only to rows explicitly categorized `SOFT_DRINKS` with a 300ml format. If a matching row is 250ml, it clears the existing image rather than display a misleading 300ml photo; the Store's safe placeholder is shown until the correct 250ml can packshot is verified. Reconcile the live SKU ID, name, category, bottleFormat and unitsPerCase against the source export before restoring those images.

## Corrective rules

1. **One SKU variant per image assignment.** Product names, exact variant, pack type and volume must agree.
2. Bundled names (for example, several flavours in one label) should be split/reconciled against live SKU records before assigning a single flavour image.
3. For livestock and fresh food, use a clear, representative photo of the correct animal/cut/produce—not an unrelated generic product photo.
4. Where a trustworthy exact match is unavailable, keep the placeholder rather than presenting a misleading product.
5. Record source URL, access date, variant, volume, image dimensions, and review status for every replacement.
6. Re-run the audit against a **read-only production export** containing `id`, `name`, `category`, `bottleFormat`, `unitsPerCase`, `bulkUnit`, `imageUrl`, and any image-source metadata. Never infer live image status from the pricing TSV alone.

## Navigation/taxonomy cross-check

The current SmartMatch taxonomy separates Alcohol, Soft drinks & water, Meat, Livestock, Groceries, Non-consumables, and Other items. Unknown category codes are sent to Other items for review rather than silently shown as groceries. Store department navigation and the More page sections are collapsible. CI passed for the latest main-branch image-repair commits on 28 October 2026; Render's canonical `I-Camagu-1` service reports the latest image-correction commit as live.

## Next action

Generate a secure, read-only production SKU export with the fields above, then reconcile this queue against live IDs and image URLs. Only then should image replacements be committed or production mappings changed.
