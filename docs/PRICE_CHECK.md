# Weekly price check

Bulk Buy prices are kept honest by a weekly check of the shops' current
specials. A scheduled task runs it every Monday morning (South African time),
using TinyFish to read the web. Anyone can also run it by hand.

## The rules (enforced by the code, not just this page)

- The **bulk price** is the best current special or case price found for
  the same product and pack, for the whole case (`unitsPerCase` units).
  It is shown as a SmartMatch bulk price that unlocks at the group's bulk
  tier, never as a single-purchase price.
- A bulk price only ever moves **down**. A higher price found is reported,
  never applied: rises are the founder's decision.
- **retail** is the regular single-item shelf price times the units, from a
  named shop. Leave it `null` if no shelf price was read. Never a promo price.
  Record it even when it is below i-Camagu's bulk price: a bulk price is always
  kept at least 5% below a checked shelf price, and
  `server/scripts/bulk-below-shelf.js` lowers it on the next start.
- Same product, same size, same pack. Never compare a different size or
  flavour.
- Every price names its **source**: the shop and what was read.

## Steps

1. **Pick what to check.** Read the catalogue (read-only) from the i-Camagu
   database (Supabase project `czbwwofxbzukpwyvadrh`). Never write to it.
   Check about 40 products a week, the ones checked longest ago first:

   ```sql
   select name, "bottleFormat", "unitsPerCase", "casePriceZAR", "retailPriceZAR", "retailPriceCheckedAt"
   from "Sku"
   where "retiredAt" is null and "casePriceZAR" is not null
     and "productType" in ('ALCOHOL','BEVERAGE','FOOD')
   order by "retailPriceCheckedAt" asc nulls first, name
   limit 40;
   ```

2. **Read the prices.** With TinyFish `fetch_content` on PriceCheck search
   pages, ten at a time, scoped to the results:
   `https://www.pricecheck.co.za/search?search=<product+size>` with
   `include_selectors: ["#main-content"]`. Where PriceCheck has nothing, use
   TinyFish `search` (location `ZA`) and the retailer's own page. Keep the
   cost down: no more than about 6 fetch calls and 10 searches a week.

3. **Write the file** `server/data/price-checks/YYYY-MM-DD.json` (today's
   date), only for products where a price was actually found:

   ```json
   { "checkedOn": "2026-11-30",
     "checks": [
       { "name": "Smirnoff 1818 Vodka", "bottleFormat": "750ml Bottle",
         "bulk": 1899.0, "retail": 2159.88,
         "source": "takealot case of 12 R1,899; Shoprite R179.99 a bottle" } ] }
   ```

   `name` and `bottleFormat` must match the catalogue exactly.

4. **Check it:** `node server/scripts/check-price-file.js <file>` must print
   `OK`, and `npx vitest run server/scripts/apply-price-checks.test.js` must
   pass.

5. **Commit and push** to `main` (and mirror to
   `claude/continue-previous-hl1mru`), message `Price check YYYY-MM-DD`,
   ending with the project's usual attribution lines. The server applies
   the file once at its next start.

6. **Report**, short: how many products were checked, which bulk prices
   will drop (old → new, shop), and any higher prices found (not applied)
   for the founder to decide on.
