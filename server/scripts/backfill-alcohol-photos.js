// Fetches a real product photo for each entry in alcohol-image-sources.json
// and applies it to the matching Sku row(s) — same end result as
// backfill-brand-images.js, but the image comes from a live retailer page
// instead of a file already sitting in the repo.
//
// Some entries are marked imageOnly: true — their source is a foreign
// retailer (bjs.com, target.com, totalwine.com, etc.). Per the founder,
// that's fine for the photo alone, since no price is ever read from these
// pages; real cost/retail pricing always comes from Makro/Ultra in person.
//
// MUST run outside this repo's Claude Code session: retail domains
// (checkers.co.za, woolworths.co.za, shoprite.co.za, etc.) are not reachable
// from that sandbox. Run this on your own machine or a Render job instead,
// with a real DATABASE_URL in the environment (same one the app already uses
// — no Supabase Storage bucket or service-role key needed, since images here
// are plain static files under public/images/, exactly like the 36 that are
// already committed).
//
// Usage:
//   node server/scripts/backfill-alcohol-photos.js            # only fills rows with no imageUrl yet, skips needsReview entries
//   node server/scripts/backfill-alcohol-photos.js --force    # re-downloads and overwrites even if imageUrl is already set
//   node server/scripts/backfill-alcohol-photos.js --include-flagged   # also downloads needsReview entries (saved to disk, NOT applied to the DB — check them by eye first)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'brands');
const MANIFEST_PATH = path.join(__dirname, 'alcohol-image-sources.json');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const INCLUDE_FLAGGED = args.includes('--include-flagged');

// Real retailer product pages return their photo in the standard e-commerce
// og:image meta tag — the same convention every major SA retailer (Checkers,
// Woolworths, Shoprite, Pick n Pay) uses for social-share previews.
function extractOgImage(html) {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match ? match[1] : null;
}

function extensionForContentType(contentType) {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  return 'jpg';
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      // Several of these sites block the default fetch UA — a normal
      // browser UA is enough to get through, no fancier evasion needed.
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html',
    },
  });
  if (!res.ok) throw new Error(`page fetch failed: HTTP ${res.status}`);
  return res.text();
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  });
  if (!res.ok) throw new Error(`image fetch failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: res.headers.get('content-type') };
}

function expectedFormatFromSourceUrl(sourceUrl) {
  // A source URL can supply a size hint, but not proof that the returned
  // og:image depicts a single bottle rather than a multipack. Never guess
  // when the retailer URL contains no explicit size.
  const decoded = decodeURIComponent(sourceUrl);
  const match = decoded.match(/(?:^|[^0-9])(\d{2,4})\s*[- ]?ml\b/i);
  return match ? `${match[1]}ml` : null;
}

function hasAmbiguousVariantName(product) {
  // A source page for one flavour/variant must not be assigned to every
  // flavour in a grouped SKU name (e.g. Red/Watermelon or Apple/Lime).
  return /\/|\b(asstd|assorted|mixed)\b/i.test(product);
}

async function processEntry(entry) {
  const { product, slug, sourceUrl, needsReview, imageOnly, note } = entry;
  const expectedFormat = entry.expectedFormat || expectedFormatFromSourceUrl(sourceUrl);
  const ambiguousVariant = hasAmbiguousVariantName(product);
  const tag = needsReview ? ' [FLAGGED — will not auto-apply]' : imageOnly ? ' [foreign source — image only, not a price reference]' : '';
  console.log(`\n${product}${tag}`);
  if (note) console.log(`  note: ${note}`);

  if (needsReview && !INCLUDE_FLAGGED) {
    console.log('  skipped (flagged — rerun with --include-flagged to download it for review)');
    return;
  }

  // Prevent a name-only match from applying one packshot to every size of a
  // product. A precise format must be present in the manifest or source URL.
  // Ambiguous grouped variants and URLs with no explicit size are review-only.
  if (!expectedFormat) console.log('  no size in source URL — image will be saved for review only');
  if (ambiguousVariant) console.log('  grouped variants in SKU name — image will be saved for review only');

  const targetWhere = expectedFormat
    ? { name: product, bottleFormat: { contains: expectedFormat } }
    : null;

  if (!FORCE && targetWhere) {
    const existing = await prisma.sku.findFirst({ where: { ...targetWhere, imageUrl: { not: null } }, select: { imageUrl: true } });
    if (existing?.imageUrl) {
      console.log(`  skipped — matching ${expectedFormat} SKU already has imageUrl (${existing.imageUrl}). Use --force to overwrite.`);
      return;
    }
  }

  const html = await fetchPage(sourceUrl);
  const imageUrl = extractOgImage(html);
  if (!imageUrl) throw new Error('no og:image meta tag found on the page');

  const { buffer, contentType } = await downloadImage(imageUrl);
  const ext = extensionForContentType(contentType);
  const filename = `${slug}.${ext}`;
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  console.log(`  saved public/images/brands/${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);

  if (needsReview || !targetWhere || ambiguousVariant) {
    console.log('  NOT applied to the DB — confirm exact product variant and pack size before assigning the image.');
    return;
  }

  const { count } = await prisma.sku.updateMany({
    where: targetWhere,
    data: { imageUrl: `/images/brands/${filename}` },
  });
  console.log(`  applied to ${count} SKU row(s) matching "${product}" and format "${expectedFormat}"`);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let failures = 0;
  for (const entry of manifest) {
    try {
      await processEntry(entry);
    } catch (err) {
      failures++;
      console.error(`  FAILED: ${err.message}`);
    }
  }
  console.log(`\nDone. ${failures} failure(s) out of ${manifest.length} entries.`);
  if (failures > 0) {
    console.log('A failure usually means the page layout changed or blocked the request — open that sourceUrl in a browser and grab the image manually if needed.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
