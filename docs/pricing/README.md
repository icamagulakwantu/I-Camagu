# Pricing research — state as at 10 September 2026

Everything the price survey produced, kept in the repo so it survives the
session it was made in. A Claude Code session is an ephemeral container; this
folder is the part worth keeping.

## Where prices live, and the rule that guards them

`Sku.retailPriceZAR` is what a member is told a shop charges. It drives the
per-product comparison in the Store and the savings total in the Basket, so a
wrong number there means iCamagu tells a family it saved them money it cannot
prove.

`Sku.retailPriceSource` says where the number came from:

| | meaning | reaches a member? |
|---|---|---|
| `VERIFIED` | read off a named retailer's page or catalogue, with the shop and date in `retailPriceNote` | **yes** |
| `ESTIMATE` | modelled. Fine for margin work and for spotting products priced above the shop | **no** |
| `null` | no price at all | no |

`server/utils/skuVisibility.js` enforces it in one place: the public catalogue
strips the price unless it is `VERIFIED`. Both member screens already guard on
the price being present, so withholding at the API boundary disables the claim
without either screen needing to know why. `PUBLIC_SKU_SELECT` in the same file
is the allowlist of columns a member may receive — `costPriceZAR` is not on it.

`server/controllers/ceremonyCostProfiles.js` is a **separate surface** with no
such flag. Those rates feed the budget a family sees when planning a ceremony.
A wrong number lands straight in someone's plan. Rule stated in that file's
header: **a rate only changes when the change can name a shop and a date.**

## Status

- 46 SKUs `VERIFIED` · 200 `ESTIMATE` · 48 with no price
- Of the 46 verified, **27 show iCamagu costing more than the shop**
- 15 ceremony budget rates repriced against sourced listings

## How the three-model survey went, and what it was worth

294 products were put to ChatGPT, Gemini and DeepSeek. Twelve products whose
real price we already knew were included unmarked, as controls.

| source | claimed | controls hit | bias |
|---|---|---|---|
| DeepSeek | 0 verified, all estimate | 8/12 | none (0.999) |
| ChatGPT | 0 verified, 16 listed | 10/12 | 15% low |
| Gemini | **168 verified**, 111 listed | **0/12** | 16% low; its *verified* rows were its worst, 20% low |

**A model's own confidence label is anti-correlated with its accuracy.** The one
that refused to claim a source was the only unbiased one. Gemini cited Makro,
Jumbo and Springbok by name on 168 rows and got every checkable price wrong.

Blending the three after correcting each for its measured bias beat every
individual source — leave-one-out mean error 7.7% against 9.2–11.8%. But
checked later against six genuinely fresh prices it came in **12.3% out and low
five times in six**. Treat every `ESTIMATE` as a floor, not a midpoint.

Google Shopping screenshots from the founder produced more usable prices in ten
minutes than all three models managed across the whole catalogue.

## Open

- **`Cow / Ox (Inkunzi)` names three animals.** *Inkunzi* is a bull; the SKU
  also says Cow and Ox. Digikraal 10 Sep 2026: bulls R31,751, cows R14,612,
  oxen R12,722. Our R22,000 is either a third under the market or nearly double
  it. Same ambiguity on `Sheep with Horns` (ram vs kapater vs ewe) and
  `Goat (Standard)`. Split these before pricing them.
- **`Ibhoma Pole Bundle` does not say how many poles.** A 6m gum pole is ~R100,
  so R450 is four or five — but a member cannot tell what they are buying.
- **Alcohol is priced above the liquor cash-and-carries.** Per litre we lose to
  Ultra and Prestons on all ten beers checked (Heineken +44%, Stella +37%,
  Milk Stout +32%). The catalogue was built from a marked-up guess rather than
  real supplier cost.
- 35 products still have no verified price — see the check sheet artifact.

## Files

| file | what it is |
|---|---|
| `alcohol.psv` | all 252 alcohol SKUs — case price, pallet pack and price, our shelf reference and its flag. Pipe-delimited; checksums to the DB at R694,700.76 |
| `consensus.csv` / `.json` | all 294: our unit price, three-source blend, spread, confidence class A/B/C |
| `ref-map.json` | `P001`–`P294` → SKU id. The survey prompts used these refs |
| `factors.json` | measured bias correction per source |
| `ultra.json`, `batch2.json` | verified competitor prices with their sources |
| `skus_clean.tsv` | catalogue snapshot the survey was built from |
| `chatgpt.raw`, `gemini.raw`, `deepseek.raw` | the three raw model runs |
| `score.py` | scores a run against the 12 controls. `python3 score.py <run> <name>` |
| `ultra.py` | matches competitor prices to SKUs by exact name + format |

`score.py` and `ultra.py` expect to run from this directory.

## The alcohol board

`alcohol.psv` is the snapshot behind the Gqeberha Liquor Board — all 252 alcohol
SKUs set against nine shops, split by what they are to us:

| | shops | what they are |
|---|---|---|
| wholesale | Ultra, Prestons, Jumbo Cash & Carry, Makro | we would buy here |
| retail | Boxer, Shoprite, Checkers, Pick n Pay, Spar Tops | we are judged here |

Enter a shop price and the board works backwards to the buy price we need:
sell at 93% of the cheapest shelf, buy at 85% of it. Those two percentages are
generalised from **one** worked example — Hennessy VS at about R589 on the
shelf, sold at R530–580, bought at R499–510 — so they are a working assumption,
not a measurement, and they are editable on the page.

**Core list: 163 of 252.** Two rules, because price alone was not enough. A line
is core when it is not a 375 ml bottle and a unit costs under R400 (R600 cognac,
R350 liqueur, R150–200 wine); beer and cider are core throughout. The second
rule drops house-brand mixing stock — Butlers, Peddler's, Relic, San Basile and
the generics — which is bar service, not a stokvel case buy.

Only six cells are filled from a named source: four Ultra broadsheet promos
(1–15 Sep 2026) and two Prestons prices (10 Sep 2026). Everything else in a shop
column has to be walked in and read off a shelf.

## Live pages

- Gqeberha Liquor Board — https://claude.ai/code/artifact/1a041bb6-fd4b-45fc-971f-3010738f043a
- Shelf Price Survey — https://claude.ai/code/artifact/debdab02-2ceb-4920-bda3-36ac66516c54
- Gqeberha Price Check (35 remaining, print-ready) — https://claude.ai/code/artifact/2d05bfcd-fceb-40ec-9365-b9eb6035418f

## Method, in one line

Never widen a price without naming a shop and a date. Hold back known prices as
controls so a source can be scored rather than trusted. When a source disagrees
with a control, believe the control.
