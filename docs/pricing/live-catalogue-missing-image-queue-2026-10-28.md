# Live catalogue missing-image review queue — 28 October 2026

## Snapshot

Source: the public production `GET /api/basket/catalogue` endpoint, audited by GitHub Actions on 28 October 2026. This is a snapshot of live catalogue metadata, not a visual review of the image URLs.

- Live SKU rows: **384**
- Rows without a category: **0**
- Category codes not mapped to a named aisle after the RUM taxonomy fix: **0**
- Rows with no `imageUrl`: **77 (20.1%)**
- Alcohol rows: **278**, with **0** missing image URLs in this snapshot.
- Missing-image rows by department: groceries **37**, livestock **8**, meat **4**, non-consumables **8**, soft drinks/water/mixers **20**.

The queue below lists only public product name, category and pack/format. It deliberately excludes SKU IDs, prices, supplier data and existing image URLs. Re-run the production-smoke audit before using this as a current work queue; the catalogue may change.

## Review rules

1. Match the exact brand, product and pack size/format. Do not reuse a 500 ml image for 1 L, a 250 ml can for another size, or a retail unit image for a bulk sack.
2. Prefer official manufacturer or reputable retailer product photography; record the source and rights/attribution requirements before applying it.
3. For generic bulk produce and staples, use consistent representative images and label them as representative rather than implying an exact branded pack.
4. Livestock imagery must match the listed animal and sex/type. Use representative imagery only where the listing makes that clear; do not imply breed, health or quality that has not been verified.
5. Cultural/ritual supplies should receive community review. Avoid sacred/restricted imagery, invented cultural details, or stereotyped stock photography.
6. If no trustworthy match is available, use the approved neutral placeholder/text treatment rather than a wrong product image.
7. Updating imagery must not alter price, stock, category, pack size, supplier, or payment data.

## Missing-image queue

### Clothing — 1

- [ ] Golf Shirt — Plain, Sizes S–3XL

### Dry goods — 6

- [ ] Beef Stock — Box
- [ ] Brown Bread Loaf — loaf
- [ ] Instant Coffee — 750 g Big Tin
- [ ] Milk Long Life — 1 L × 6-pack
- [ ] Peanut Butter 400 g — jar
- [ ] Tea — 1 kg Box

### Fresh produce — 10

- [ ] Cabbage — Box (Bulk)
- [ ] Carrots — 10 kg Sack
- [ ] Green Apples — Box (Bulk)
- [ ] Green Peppers — Box (Bulk)
- [ ] Onions — 10 kg Sack
- [ ] Potatoes — 10 kg Sack
- [ ] Red Peppers — Box (Bulk)
- [ ] Spinach — Box (Bulk Bunches)
- [ ] Sweet Corn — Box (Bulk)
- [ ] Yellow Peppers — Box (Bulk)

### Grocery — 1

- [ ] Butter — 1 kg

### Bulk groceries — 20

- [ ] Amazimba — 12.5 kg Bag
- [ ] Amazimba — 10 kg Bag
- [ ] Cooking Oil — 5 L
- [ ] Flour — 10 kg Bag
- [ ] Flour — 12.5 kg Bag
- [ ] Maize Meal — 10 kg Bag
- [ ] Maize Meal — 12.5 kg Bag
- [ ] Maize Meal — 50 kg Bag
- [ ] Mayonnaise — 3 kg Tub
- [ ] Mayonnaise — 5 kg Tub
- [ ] Rice — 12.5 kg Bag
- [ ] Rice — 10 kg Bag
- [ ] Samp — 12.5 kg Bag
- [ ] Samp — 10 kg Bag
- [ ] Sugar — 10 kg Bag
- [ ] Sugar — 12.5 kg Bag
- [ ] Sweet Chilli Sauce — 3 kg Tub
- [ ] Sweet Chilli Sauce — 5 kg Tub
- [ ] Umbona — 10 kg Bag
- [ ] Umbona — 12.5 kg Bag

### Livestock — 8

- [ ] Goat — Inkabi (male)
- [ ] Goat — Imazi (female)
- [ ] Inkomo / Cow — Inkabi (male)
- [ ] Inkomo / Cow — Imazi (female)
- [ ] Sheep — Inkabi (male)
- [ ] Sheep — Imazi (female)
- [ ] Sybok — Inkabi (male)
- [ ] Sybok — Imazi (female)

### Meat — 4

- [ ] Beef Mince 5 kg — pack
- [ ] Chicken Legs — Sack (Bulk)
- [ ] Chicken Trays — Box (Bulk)
- [ ] Whole Chicken — Box (Bulk, ~1.8 kg each bird)

### Mixers — 1

- [ ] Maraschino Cherries (Syrup) — 350 ml Jar

### Ritual supplies — 2

- [ ] Ikoto (Bentonite Clay) — item
- [ ] Imphepho Bundle — bundle

### Soft drinks — 4

- [ ] Coca-Cola — Can (250 ml)
- [ ] Fanta Orange — Can (250 ml)
- [ ] Sprite — Can (250 ml)
- [ ] Stoney Ginger Beer — Can (250 ml)

### Ulwaluko supplies — 5

- [ ] 25 L Water Container — item
- [ ] Ibhoma Pole Bundle — bundle
- [ ] Plain Grey Blanket — item
- [ ] Tarpaulin Sail — item
- [ ] White Blanket with Black Stripes — item

### Water — 15

- [ ] Bonaqua Sparkling Water — Bottle (500 ml)
- [ ] Bonaqua Sparkling Water — Bottle (1 L)
- [ ] Bonaqua Sparkling Water — Bottle (1.5 L)
- [ ] Tsitsikamma Sparkling Water — Bottle (1.5 L)
- [ ] Tsitsikamma Sparkling Water — Bottle (500 ml)
- [ ] Tsitsikamma Sparkling Water — Bottle (1 L)
- [ ] Tsitsikamma Still Water — Bottle (500 ml)
- [ ] Tsitsikamma Still Water — Bottle (1.5 L)
- [ ] Tsitsikamma Still Water — Bottle (1 L)
- [ ] Valpre Sparkling Water — Bottle (500 ml)
- [ ] Valpre Sparkling Water — Bottle (1.5 L)
- [ ] Valpre Sparkling Water — Bottle (1 L)
- [ ] Valpre Still Water — Bottle (500 ml)
- [ ] Valpre Still Water — Bottle (1.5 L)
- [ ] Valpre Still Water — Bottle (1 L)

## Next actions

- [ ] Assign a verified source to each row; preserve source and license/attribution notes.
- [ ] Verify image-to-pack-size match visually before updating the live `imageUrl`.
- [ ] Re-run the live audit and confirm the missing-image count decreases without category or pack-size changes.
- [ ] Keep the image work staged and reversible; do not apply unverified URLs to production in bulk.
