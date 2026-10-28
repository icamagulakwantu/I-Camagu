# iCamagu catalogue audit — 27 October 2026

## Scope and limits

Reviewed `docs/pricing/skus_clean.tsv` from the current `main` branch. This is a pricing/catalogue extract, not the live database: it contains no `imageUrl` field, so it cannot prove whether a live SKU image is correct, broken, missing, or mismatched. Do not bulk-replace production images from this file alone.

## Summary

- Rows reviewed: **294**
- Distinct category codes: **27**
- Rows with a blank `format`: **32**
- Image audit status: **Blocked pending a current export of live SKU IDs, names, formats, categories, and image URLs.**
- Image/pack-size checks must compare the image itself with the exact product variant and pack size, not only the brand name.

## Category counts

| Category | SKU rows |
|---|---:|
| BEER | 39 |
| BRANDY | 4 |
| CANNED_GOODS | 1 |
| CHAMPAGNE | 2 |
| CIDER_RTD | 35 |
| COGNAC | 15 |
| DRY_GOODS | 6 |
| FRESH_PRODUCE | 8 |
| GIN | 28 |
| GROCERY | 1 |
| GROCERY_BULK | 3 |
| LIQUEUR | 37 |
| LIVESTOCK_ANIMAL | 3 |
| MEAT | 3 |
| MIXER | 5 |
| RITUAL_SUPPLIES | 2 |
| SOFT_DRINKS | 4 |
| SPARKLING | 4 |
| TEQUILA | 13 |
| TEQUILA_PREMIUM | 8 |
| ULWALUKO_SUPPLIES | 5 |
| VODKA | 17 |
| VODKA_PREMIUM | 7 |
| WATER | 1 |
| WHISKY | 30 |
| WINE | 9 |
| WINE_BOX | 4 |

## Rows missing format

These records need a pack/size description before catalogue QA can reliably distinguish variants:

| SKU ID | Product | Category | Listed price (ZAR) |
|---|---|---|---:|
| cmtjzlr3l000pyt0bh5vn467r | Baked Beans 410g Tin | CANNED_GOODS | 15.00 |
| cmtjzlrvd000tyt0bwu3c5i58 | Brown Bread Loaf | DRY_GOODS | 20.00 |
| cmtjzls8y000vyt0bwtzoxc5z | Flour 2.5kg | DRY_GOODS | 40.00 |
| cmtjzlray000qyt0buxav2b6d | Instant Coffee 750g | DRY_GOODS | 165.00 |
| cmtjzls26000uyt0b8gh9gofb | Milk 2L | DRY_GOODS | 35.00 |
| cmtjzlrok000syt0bn27ktobv | Peanut Butter 400g | DRY_GOODS | 50.00 |
| cmtjzlrhr000ryt0bxn9gu6yy | Tea 100 Bags | DRY_GOODS | 60.00 |
| cmtjzlnp1000cyt0bi7tkqsh6 | Cabbage Head | FRESH_PRODUCE | 22.00 |
| cmtjzlqj6000myt0bc5rt01if | Carrots 10kg | FRESH_PRODUCE | 95.00 |
| cmtjzlmqt0007yt0bahhm0j2l | Green Apples (per kg) | FRESH_PRODUCE | 38.00 |
| cmtjzlqpz000nyt0bis6579x1 | Green Peppers (per kg) | FRESH_PRODUCE | 32.00 |
| cmtjzlqcd000lyt0bl7fd2cb5 | Onions 10kg | FRESH_PRODUCE | 95.00 |
| cmtjzlni8000byt0b5ltludaf | Potatoes 10kg | FRESH_PRODUCE | 110.00 |
| cmtjzlqwt000oyt0br6rpnt1r | Red Peppers (per kg) | FRESH_PRODUCE | 48.00 |
| cmtjzlnvt000dyt0b1h7dqi8d | Spinach Bundle | FRESH_PRODUCE | 25.00 |
| cmtjzlmxl0008yt0bcbiugk7y | Butter 500g | GROCERY | 85.00 |
| cmtjzlo2k000eyt0blxi2fhwu | Cooking Oil 5L | GROCERY_BULK | 190.00 |
| cmtjzlnbg000ayt0b2z2ut1r8 | Maize Meal 50kg | GROCERY_BULK | 520.00 |
| cmtjzlo9d000fyt0biz85kmnw | Sugar 10kg | GROCERY_BULK | 245.00 |
| cmtjzlq5k000kyt0b7r3hj8tl | Cow / Ox (Inkunzi) | LIVESTOCK_ANIMAL | 22000.00 |
| cmtjzlpys000jyt0bvi0w1iro | Goat (Standard) | LIVESTOCK_ANIMAL | 2200.00 |
| cmtjzln4e0009yt0bxv04xhdx | Sheep with Horns | LIVESTOCK_ANIMAL | 3200.00 |
| cmtjzlpea000gyt0bylh6lko4 | Beef Mince 5kg | MEAT | 574.95 |
| cmtjzlprx000iyt0bls3u655l | Boerewors 5kg | MEAT | 474.95 |
| cmtjzlpl4000hyt0bv9lvyrbj | Whole Chicken (~1.8kg) | MEAT | 99.00 |
| cmtjzllbb0000yt0bhuvdqdwg | Ikoto (Bentonite Clay) | RITUAL_SUPPLIES | 65.00 |
| cmtjzlljg0001yt0bd6jd3ujk | Imphepho Bundle | RITUAL_SUPPLIES | 45.00 |
| cmtjzlmk00006yt0bx7s5pj10 | 25L Water Container | ULWALUKO_SUPPLIES | 180.00 |
| cmtjzlmd60005yt0b6s4evoa3 | Ibhoma Pole Bundle | ULWALUKO_SUPPLIES | 450.00 |
| cmtjzllqb0002yt0bh1leotps | Plain Grey Blanket | ULWALUKO_SUPPLIES | 350.00 |
| cmtjzlm6d0004yt0bk1nc470m | Tarpaulin Sail | ULWALUKO_SUPPLIES | 350.00 |
| cmtjzllzi0003yt0b4ugvk5ts | White Blanket with Black Stripes | ULWALUKO_SUPPLIES | 450.00 |

## Suspected pack-label inconsistencies (verify before changing live SKUs)

These records use the word “Quart” with a size that does not match the usual South African 750 ml quart convention. This is a **review flag, not an automatic correction**: confirm the exact SKU with the supplier/manufacturer before editing a live format or image.

| TSV row | SKU | Current format | Review action |
|---:|---|---|---|
| 28 | Heineken | Quart (500ml) | Verify whether this is a 500 ml bottle/can and correct the pack label only with source evidence |
| 36 | Windhoek Draught | Quart (440ml) | Verify the physical container and whether the intended SKU is a 440 ml can |
| 39 | Windhoek Lager/Light | Quart (500ml) | Verify the physical container and whether the intended SKU is a 500 ml can/bottle |

The export has no image URL or source metadata, so image correctness cannot be assessed from this TSV alone. Live image review must use the current production SKU records and their actual image URLs.

## Required next steps

1. Export live SKU data from the production catalogue using a read-only, access-controlled admin export. Include SKU ID, name, brand, category, format, units per case, bulk unit, image URL, image source, and price source/last-checked date.
2. Build an image review queue with one row per SKU and a thumbnail. Validate image URL response, image dimensions, package type, brand, and variant/size. Flag duplicates, unrelated products, low-quality cutouts, and missing images.
3. Replace images only after the SKU variant is verified against a reliable manufacturer/retailer source. Keep attribution/source URL and audit date. Use a branded placeholder when no reliable match is found.
4. Review the 32 blank-format rows listed above; don't guess pack sizes.
5. Reconcile this TSV against live catalogue records before changing live data. Treat listed prices as catalogue values, not a supplier-confirmed quote unless the source confirms that.

## Guardrails

- Never infer that a can, bottle, quart, or 750 ml variant is interchangeable with another variant of the same brand.
- Never use a generic search result image as a substitute without confirming the exact variant.
- Keep missing/uncertain images visibly labelled rather than displaying a confidently wrong image.
- Keep supplier availability, final order pricing, and discounts unconfirmed until a written quote supports them.
