// Fetches a real product photo for each entry in grocery-image-sources.json
// and applies it to the matching Sku row(s) — the grocery/produce/meat/water
// counterpart to backfill-alcohol-photos.js. Same mechanics, same rules:
// imageOnly entries are foreign sources used for the photo only, never a
// price; needsReview entries are downloaded for a human to check but never
// auto-applied to the DB.
//
// MUST run outside this repo's Claude Code session: retail domains are not
// reachable from that sandbox. Run via the "Backfill Grocery Product Photos"
// GitHub Actions workflow (or locally with a real DATABASE_URL).
//
// Usage:
//   node server/scripts/backfill-grocery-photos.js
//   node server/scripts/backfill-grocery-photos.js --force
//   node server/scripts/backfill-grocery-photos.js --include-flagged
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'brands');
const MANIFEST_PATH = path.join(__dirname, 'grocery-image-sources.json');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const INCLUDE_FLAGGED = args.includes('--include-flagged');

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

async function processEntry(entry) {
  const { product, slug, sourceUrl, needsReview, imageOnly, note } = entry;
  const tag = needsReview ? ' [FLAGGED — will not auto-apply]' : imageOnly ? ' [foreign source — image only, not a price reference]' : '';
  console.log(`\n${product}${tag}`);
  if (note) console.log(`  note: ${note}`);

  if (needsReview && !INCLUDE_FLAGGED) {
    console.log('  skipped (flagged — rerun with --include-flagged to download it for review)');
    return;
  }

  if (!FORCE) {
    const existing = await prisma.sku.findFirst({ where: { name: product }, select: { imageUrl: true } });
    if (existing?.imageUrl) {
      console.log(`  skipped — already has imageUrl (${existing.imageUrl}). Use --force to overwrite.`);
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

  if (needsReview) {
    console.log('  NOT applied to the DB — open the file, confirm it is the right product, then update Sku.imageUrl by hand.');
    return;
  }

  const { count } = await prisma.sku.updateMany({
    where: { name: product },
    data: { imageUrl: `/images/brands/${filename}` },
  });
  console.log(`  applied to ${count} Sku row(s) matching name "${product}"`);
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
