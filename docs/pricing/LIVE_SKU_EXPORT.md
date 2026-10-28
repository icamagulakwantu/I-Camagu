# Live SKU catalogue export for the image audit

The checked-in `docs/pricing/skus_clean.tsv` is a pricing snapshot and **does not contain `imageUrl`**. It is therefore not sufficient to audit the exact product image currently served to users.

To generate the complete, read-only catalogue export from the database used by the application, run from the repository root in an environment with the appropriate `DATABASE_URL` configured:

```sh
node server/scripts/export-sku-catalogue.js
```

By default this writes `tmp/catalogue-audit/sku-catalogue-export.csv` (a local output, not a committed production-data dump). A custom path can be supplied as the first argument:

```sh
node server/scripts/export-sku-catalogue.js ./tmp/sku-catalogue-export.csv
```

The CSV includes SKU ID, name, category, product type, format/size, case quantity, buying unit, member-facing price fields, retail-price provenance, image URL and creation date. It deliberately excludes supplier cost, basket contents and personal/customer data.

Use the export to flag:
- blank image URLs;
- category/vertical mismatches;
- bottle-size or pack-quantity conflicts;
- URLs that point to missing, framed, promotional, low-resolution or wrong-variant images.

Do not assume an image is correct from the filename alone. Verify the actual image against the exact product name, variant and pack size. If no matching image can be verified, leave the SKU on the Store's safe placeholder until a verified packshot is available.
