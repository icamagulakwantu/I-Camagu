# iCamagu navigation and catalogue audit — 28 October 2026

## Scope

Reviewed the current `main` branch navigation flow, SmartMatch taxonomy, catalogue image source manifest, image backfill script, and the committed pricing extract. This is a source-code/repository audit; it is not a claim that every live database image has been visually checked.

## Findings and changes

### 1. SmartMatch category isolation

- The display taxonomy explicitly separates Alcohol, Soft drinks & water, Meat & poultry, Livestock, Groceries, Non-consumables, and Other items.
- All 27 category codes in the current pricing extract are covered by the taxonomy test; unknown future codes route to Other items rather than silently appearing under Groceries.
- Search spans departments and matches product name, category, format and bulk-unit labels. Search results show each product's assigned department.
- Department selection is collapsible, and the More page uses collapsible sections. Bottom navigation consistently labels the marketplace entry SmartMatch.

### 2. Lost-page and navigation behavior

- `MainApp` checks the current pathname with `isKnownAppPath` and displays a recovery page for unrecognised app paths.
- Recovery actions call the shared `setScreen` navigation handler, which updates both screen state and the URL to a known route. This avoids trapping the user on an unknown URL.
- Core destinations are consistently available from the fixed bottom navigation: Home, Ceremonies, SmartMatch, Stokvels and More.
- More includes a “Lost? Start here” signpost and collapsible feature groups.
- Remaining manual UX test: open an invalid URL while signed in and signed out; verify recovery actions, browser Back, invite links, refresh on deep links, and mobile safe-area behavior. Source review alone cannot establish all browser behavior.

### 3. Catalogue image automation safety fix

The earlier `backfill-alcohol-photos.js` updated every SKU row sharing a product name. That could assign a 750 ml image to a different size or apply one flavour's photo to several grouped variants. This is unsafe even if the image itself is high quality.

Commit `c88db985ef2daa040c1474eeffaa245a4781dc82` changes the script so it:
- derives a size hint only when the source URL explicitly includes a size such as 330 ml, 440 ml, 700 ml or 750 ml;
- updates only rows whose `bottleFormat` matches that size hint;
- refuses to auto-apply grouped variant names containing slashes or “assorted/mixed” labels;
- saves source images for review instead of applying them where the size is unknown or the variant is ambiguous;
- retains existing manual-review flags and the rule that foreign retailer pages are image references only, never pricing sources.

This is a guardrail improvement, not proof that every manifest URL or downloaded `og:image` is a correct product packshot. Retailer pages can return multipack or promotional imagery, so visual verification is still required.

### 4. Image manifest status

- `server/scripts/alcohol-image-sources.json` contains 138 product source entries.
- 18 entries are explicitly marked `needsReview`.
- 22 entries are marked `imageOnly` and use non-South-African retail sources for imagery only.
- Some manifest entries do not have a matching local asset filename yet; the filename audit is a review queue, not proof that the live SKU image is missing, because an existing image may use a different approved filename.
- The current `docs/pricing/skus_clean.tsv` extract contains 294 rows and 27 category codes, but no live `imageUrl` column. It cannot be used to validate the live image against a SKU.

## Next audit steps

1. Export a read-only live catalogue snapshot with SKU ID, name, category, `bottleFormat`, units per case, `imageUrl`, and image source metadata. Do not include customer data.
2. Generate a per-SKU review queue with thumbnail, expected variant/size, image URL status, image dimensions, and source URL.
3. Review alcohol first (including grouped flavour names and all non-750 ml formats), then groceries, livestock, meat, and non-consumables.
4. For each image, record one of: verified exact match, wrong variant/size, low quality, broken URL, missing, or manual review. Do not silently substitute an image based on brand alone.
5. Run the mobile navigation smoke test on the production site and verify browser Back, direct links, offline messaging, and bottom-navigation overlap.

## Launch caution

Do not treat a passing CI run or a successful Render deploy as proof that the whole live catalogue is accurate. The latest CI run for the script safety change is still pending at the time this audit was written; confirm its conclusion before treating that change as verified.
