# Running a read-only live catalogue image audit

The committed \`docs/pricing/skus_clean.tsv\` is a pricing extract and does not contain live \`imageUrl\` values. Do not use it alone to replace images.

## Export the live SKU catalogue safely

From an authenticated server shell with the same \`DATABASE_URL\` as the production service, run:

\`\`\`sh
node server/scripts/export-catalogue-image-audit.js > catalogue-image-audit.csv
\`\`\`

The script is read-only. It exports only SKU fields needed to audit product imagery and variants; it does not export users, baskets, orders, retail prices, or supplier costs. It classifies image URLs as missing, local, external, or invalid. These are triage labels, not claims that an image is visually correct or that an external URL is reachable.

Do not commit a production export to the public repository: it can reveal commercial catalogue details. Share it privately for review or keep it in a private workspace.

## Review status definitions

- \`MISSING_IMAGE\`: no image URL is stored.
- \`LOCAL_ASSET_NEEDS_VISUAL_REVIEW\`: local app path exists in the row; confirm the file exists and visually matches the exact SKU.
- \`EXTERNAL_URL_NEEDS_VISUAL_REVIEW\`: external URL is present; confirm it loads and depicts the exact variant and pack size.
- \`INVALID_IMAGE_URL\`: non-empty value cannot be parsed as a URL or local path.

For every replacement, preserve the source URL, review date, exact variant/size, and image dimensions in a private review sheet. Never auto-assign a 750 ml packshot to a smaller bottle, or one flavour's image to a bundled/mixed-flavour SKU. If an exact match cannot be confirmed, clear the misleading image and let the Store show its placeholder.
