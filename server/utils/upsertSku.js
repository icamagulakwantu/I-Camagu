// Prisma rejects `null` for a field that's part of a compound @@unique key
// (Sku's [name, bottleFormat]) when used in upsert's/findUnique's `where` —
// it throws "Argument `bottleFormat` must not be null." even though the
// column itself is nullable, because a compound-unique lookup only works
// when every field in the constraint is non-null. Every non-alcohol,
// non-beverage Sku uses bottleFormat: null, so prisma.sku.upsert() silently
// failed for all of them in production for as long as this pattern existed.
// This does a manual find-then-create-or-update instead, which works for
// both null and non-null bottleFormat.
export async function upsertSkuByNameAndBottleFormat(prisma, item, updateData) {
  const bottleFormat = item.bottleFormat ?? null;
  const existing = await prisma.sku.findFirst({ where: { name: item.name, bottleFormat } });
  if (existing) {
    // No updateData means create-only: the row exists, so leave it exactly as
    // the business last set it. Passing {} is how a caller says "fill the gap
    // if it is missing, otherwise keep your hands off".
    if (updateData && Object.keys(updateData).length > 0) {
      await prisma.sku.update({ where: { id: existing.id }, data: updateData });
    }
  } else {
    await prisma.sku.create({ data: item });
  }
}
