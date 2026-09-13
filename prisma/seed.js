// prisma/seed.js
// Seeds the real iCamagu SKU catalogue (256 items, case/pallet priced from
// confirmed category discount rates) plus two sample partners for testing
// the Bulk Matching Engine. Run automatically as part of the Render build
// command — see instructions below this file.

import { PrismaClient } from '@prisma/client';
import { upsertSkuByNameAndBottleFormat } from '../server/utils/upsertSku.js';
const prisma = new PrismaClient();

const skuItems = [
  { name: 'Black Label', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/carling-black-label.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 279.36, palletPackQty: 60, palletPriceZAR: 16070.40, supplierPortfolio: 'SAB' },
  { name: 'Black Label', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/carling-black-label.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'SAB' },
  { name: 'Heineken', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (500ml)', unitsPerCase: 12, casePriceZAR: 325.92, palletPackQty: 60, palletPriceZAR: 18748.80, supplierPortfolio: 'Heineken SA' },
  { name: 'Heineken', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Heineken', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Castle Lager', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lager.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 279.36, palletPackQty: 60, palletPriceZAR: 16070.40, supplierPortfolio: 'SAB' },
  { name: 'Castle Lager', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lager.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'SAB' },
  { name: 'Castle Lager', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lager.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'SAB' },
  { name: 'Castle Milk Stout', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-milk-stout.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 325.92, palletPackQty: 60, palletPriceZAR: 18748.80, supplierPortfolio: 'SAB' },
  { name: 'Castle Milk Stout', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-milk-stout.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'SAB' },
  { name: 'Castle Milk Stout', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-milk-stout.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'SAB' },
  { name: 'Castle Lite', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lite.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 279.36, palletPackQty: 60, palletPriceZAR: 16070.40, supplierPortfolio: 'SAB' },
  { name: 'Castle Lite', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lite.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'SAB' },
  { name: 'Castle Lite', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/castle-lite.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'SAB' },
  { name: 'Corona', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/corona.png', bottleFormat: 'Dumpy (355ml)', unitsPerCase: 24, casePriceZAR: 465.60, palletPackQty: 84, palletPriceZAR: 37497.60, supplierPortfolio: 'SAB' },
  { name: 'Corona', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/corona.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 512.16, palletPackQty: 84, palletPriceZAR: 41247.36, supplierPortfolio: 'SAB' },
  { name: 'Sol', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Sol', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Windhoek Lager/Light', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (500ml)', unitsPerCase: 12, casePriceZAR: 302.64, palletPackQty: 60, palletPriceZAR: 17409.60, supplierPortfolio: 'Heineken SA' },
  { name: 'Windhoek Lager/Light', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Windhoek Lager/Light', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Windhoek Draught', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (440ml)', unitsPerCase: 12, casePriceZAR: 337.56, palletPackQty: 60, palletPriceZAR: 19418.40, supplierPortfolio: 'Heineken SA' },
  { name: 'Windhoek Draught', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 465.60, palletPackQty: 84, palletPriceZAR: 37497.60, supplierPortfolio: 'Heineken SA' },
  { name: 'Flying Fish Lemon/Apple', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/flying-fish.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'SAB' },
  { name: 'Flying Fish Lemon/Apple', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/flying-fish.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'SAB' },
  { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 291.00, palletPackQty: 60, palletPriceZAR: 16740.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'Heineken SA' },
  { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Budweiser', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'SAB' },
  { name: 'Budweiser', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'SAB' },
  { name: 'Stella Artois', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/stella-artois.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'SAB' },
  { name: 'Stella Artois', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/stella-artois.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 442.32, palletPackQty: 84, palletPriceZAR: 35622.72, supplierPortfolio: 'SAB' },
  { name: 'Hansa Pilsener', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/hansa-pilsener.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 267.72, palletPackQty: 60, palletPriceZAR: 15400.80, supplierPortfolio: 'SAB' },
  { name: 'Hansa Pilsener', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/hansa-pilsener.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 302.64, palletPackQty: 84, palletPriceZAR: 24373.44, supplierPortfolio: 'SAB' },
  { name: 'Hansa Pilsener', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/hansa-pilsener.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'SAB' },
  { name: 'Guinness Foreign Extra', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 558.72, palletPackQty: 84, palletPriceZAR: 44997.12, supplierPortfolio: 'Diageo SA' },
  { name: 'Guinness Foreign Extra', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 605.28, palletPackQty: 84, palletPriceZAR: 48746.88, supplierPortfolio: 'Diageo SA' },
  { name: 'Lion Lager', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/lion-lager.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 244.44, palletPackQty: 60, palletPriceZAR: 14061.60, supplierPortfolio: 'SAB' },
  { name: 'Lion Lager', category: 'BEER', productType: 'ALCOHOL', imageUrl: '/images/brands/lion-lager.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 302.64, palletPackQty: 84, palletPriceZAR: 24373.44, supplierPortfolio: 'SAB' },
  { name: 'Savanna Dry/Light', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 407.40, palletPackQty: 60, palletPriceZAR: 23436.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Savanna Dry/Light', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'Heineken SA' },
  { name: 'Savanna Dry/Light', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 442.32, palletPackQty: 84, palletPriceZAR: 35622.72, supplierPortfolio: 'Heineken SA' },
  { name: 'Savanna Angry Lemon', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Savanna Angry Lemon', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 465.60, palletPackQty: 84, palletPriceZAR: 37497.60, supplierPortfolio: 'Heineken SA' },
  { name: 'Breezer (Red/Watermelon)', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (275ml)', unitsPerCase: 24, casePriceZAR: 465.60, palletPackQty: 84, palletPriceZAR: 37497.60, supplierPortfolio: 'Martini Bacardi' },
  { name: 'Brutal Fruit Ruby/Litchi', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/brutal-fruit.png', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 407.40, palletPackQty: 60, palletPriceZAR: 23436.00, supplierPortfolio: 'SAB' },
  { name: 'Brutal Fruit Ruby/Litchi', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/brutal-fruit.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'SAB' },
  { name: 'Brutal Fruit Ruby/Litchi', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/brutal-fruit.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'SAB' },
  { name: 'Bernini Classic/Blush/Ruby', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (275ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'Heineken SA' },
  { name: 'Bernini Classic/Blush/Ruby', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Redd\'s Berry/Orig/Green', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/redds.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'SAB' },
  { name: 'Redd\'s Berry/Orig/Green', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/redds.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'SAB' },
  { name: 'Redd\'s MXD Pine/Guarana', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/mxd.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'SAB' },
  { name: 'Redd\'s MXD Pine/Guarana', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/mxd.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'SAB' },
  { name: 'Extreme Energy', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (500ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'Heineken SA' },
  { name: 'Extreme Energy', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'Heineken SA' },
  { name: 'Chillers Punch', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (500ml)', unitsPerCase: 24, casePriceZAR: 325.92, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'Local Value Portfolio' },
  { name: 'Chillers Punch', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Local Value Portfolio' },
  { name: 'Hunter\'s Dry/Gold', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 419.04, palletPackQty: 60, palletPriceZAR: 24105.60, supplierPortfolio: 'Heineken SA' },
  { name: 'Hunter\'s Dry/Gold', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Hunter\'s Dry/Gold', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Hunter\'s Chilled', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'Heineken SA' },
  { name: 'Hunter\'s Chilled', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 442.32, palletPackQty: 84, palletPriceZAR: 35622.72, supplierPortfolio: 'Heineken SA' },
  { name: 'Strongbow Gold/Apple', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: 395.76, palletPackQty: 60, palletPriceZAR: 22766.40, supplierPortfolio: 'Heineken SA' },
  { name: 'Strongbow Gold/Apple', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 372.48, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA' },
  { name: 'Strongbow Gold/Apple', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 419.04, palletPackQty: 84, palletPriceZAR: 33747.84, supplierPortfolio: 'Heineken SA' },
  { name: 'Kopparberg Strawberry/Lime', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (500ml)', unitsPerCase: 24, casePriceZAR: 512.16, palletPackQty: 84, palletPriceZAR: 41247.36, supplierPortfolio: 'Heineken SA' },
  { name: 'Kopparberg Strawberry/Lime', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 582.00, palletPackQty: 84, palletPriceZAR: 46872.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Smirnoff Spin/Storm', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (250ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'Diageo SA' },
  { name: 'Smirnoff Spin/Storm', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 442.32, palletPackQty: 84, palletPriceZAR: 35622.72, supplierPortfolio: 'Diageo SA' },
  { name: 'Flying Fish Chill', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/flying-fish.png', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24, casePriceZAR: 349.20, palletPackQty: 84, palletPriceZAR: 28123.20, supplierPortfolio: 'SAB' },
  { name: 'Flying Fish Chill', category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/flying-fish.png', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 395.76, palletPackQty: 84, palletPriceZAR: 31872.96, supplierPortfolio: 'SAB' },
  { name: 'Belgravia G&T (Asstd)', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Dumpy (275ml)', unitsPerCase: 24, casePriceZAR: 442.32, palletPackQty: 84, palletPriceZAR: 35622.72, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Belgravia G&T (Asstd)', category: 'CIDER_RTD', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 488.88, palletPackQty: 84, palletPriceZAR: 39372.48, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Klipdrift Export', category: 'BRANDY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken (Distell)' },
  { name: 'Viceroy 5 Year Old', category: 'BRANDY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1843.20, palletPackQty: 60, palletPriceZAR: 105984.00, supplierPortfolio: 'Heineken (Distell)' },
  { name: 'Wellington VO', category: 'BRANDY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1900.80, palletPackQty: 60, palletPriceZAR: 109296.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Jameson Original Irish', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3225.60, palletPackQty: 60, palletPriceZAR: 185472.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Jameson Original Irish', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1728.00, palletPackQty: 60, palletPriceZAR: 99360.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Jameson Select Reserve', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4838.40, palletPackQty: 60, palletPriceZAR: 278208.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Jameson Caskmates', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4377.60, palletPackQty: 60, palletPriceZAR: 251712.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Johnnie Walker Red Label', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Johnnie Walker Red Label', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1555.20, palletPackQty: 60, palletPriceZAR: 89424.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Johnnie Walker Black Label', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4377.60, palletPackQty: 60, palletPriceZAR: 251712.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Johnnie Walker Black Label', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2304.00, palletPackQty: 60, palletPriceZAR: 132480.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Johnnie Walker Double Black', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5529.60, palletPackQty: 60, palletPriceZAR: 317952.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Johnnie Walker Gold Label Reserve', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 8640.00, palletPackQty: 60, palletPriceZAR: 496800.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Jack Daniel\'s Old No.7', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4147.20, palletPackQty: 60, palletPriceZAR: 238464.00, supplierPortfolio: 'Brown-Forman' },
  { name: 'Jack Daniel\'s Old No.7', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Brown-Forman' },
  { name: 'Jack Daniel\'s Tennessee Honey', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4147.20, palletPackQty: 60, palletPriceZAR: 238464.00, supplierPortfolio: 'Brown-Forman' },
  { name: 'Jack Daniel\'s Tennessee Honey', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Brown-Forman' },
  { name: 'J&B Rare', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2304.00, palletPackQty: 60, palletPriceZAR: 132480.00, supplierPortfolio: 'Diageo SA' },
  { name: 'J&B Rare', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1267.20, palletPackQty: 60, palletPriceZAR: 72864.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Bells Extra Special', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2419.20, palletPackQty: 60, palletPriceZAR: 139104.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Bells Extra Special', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1324.80, palletPackQty: 60, palletPriceZAR: 76176.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Chivas Regal 12 Year Old', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4838.40, palletPackQty: 60, palletPriceZAR: 278208.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Chivas Regal 12 Year Old', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2534.40, palletPackQty: 60, palletPriceZAR: 145728.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Chivas Regal 15 Year Old', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 7833.60, palletPackQty: 60, palletPriceZAR: 450432.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Glenfiddich 12 Year', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 7550.40, palletPackQty: 60, palletPriceZAR: 434148.00, supplierPortfolio: 'William Grant & Sons' },
  { name: 'The Glenlivet 12 Year', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 7833.60, palletPackQty: 60, palletPriceZAR: 450432.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Bain\'s Cape Mountain', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2764.80, palletPackQty: 60, palletPriceZAR: 158976.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Bain\'s Cape Mountain', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1497.60, palletPackQty: 60, palletPriceZAR: 86112.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Scottish Leader Original', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Scottish Leader Original', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1152.00, palletPackQty: 60, palletPriceZAR: 66240.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Three Ships 5 Year Old', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Three Ships 5 Year Old', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1209.60, palletPackQty: 60, palletPriceZAR: 69552.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Firstwatch Whisky', category: 'WHISKY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2016.00, palletPackQty: 60, palletPriceZAR: 115920.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Hennessy VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 6336.00, palletPackQty: 60, palletPriceZAR: 364320.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Hennessy VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 3916.80, palletPackQty: 60, palletPriceZAR: 225216.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Hennessy VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 10260.00, palletPackQty: 60, palletPriceZAR: 589950.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Hennessy XO', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 33480.00, palletPackQty: 60, palletPriceZAR: 1925100.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Remy Martin VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9792.00, palletPackQty: 60, palletPriceZAR: 563040.00, supplierPortfolio: 'Remy Cointreau' },
  { name: 'Remy Martin 1738 Accord Royal', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 13824.00, palletPackQty: 60, palletPriceZAR: 794880.00, supplierPortfolio: 'Remy Cointreau' },
  { name: 'Honor VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5184.00, palletPackQty: 60, palletPriceZAR: 298080.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Honor VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Martell VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 6102.00, palletPackQty: 60, palletPriceZAR: 350865.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Martell Blue Swift VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 10800.00, palletPackQty: 60, palletPriceZAR: 621000.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Courvoisier VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5990.40, palletPackQty: 60, palletPriceZAR: 344448.00, supplierPortfolio: 'Suntory' },
  { name: 'Courvoisier VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9446.40, palletPackQty: 60, palletPriceZAR: 543168.00, supplierPortfolio: 'Suntory' },
  { name: 'Bisquit & Dubouche VS', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5644.80, palletPackQty: 60, palletPriceZAR: 324576.00, supplierPortfolio: 'Local Import' },
  { name: 'Bisquit & Dubouche VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9676.80, palletPackQty: 60, palletPriceZAR: 556416.00, supplierPortfolio: 'Local Import' },
  { name: 'D\'USSE VSOP', category: 'COGNAC', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9504.00, palletPackQty: 60, palletPriceZAR: 546480.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Strettons London Dry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Strettons London Dry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1094.40, palletPackQty: 60, palletPriceZAR: 62928.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Strettons Wild Berry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Strettons Wild Berry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1094.40, palletPackQty: 60, palletPriceZAR: 62928.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Old Buck Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1843.20, palletPackQty: 60, palletPriceZAR: 105984.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Old Buck Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1036.80, palletPackQty: 60, palletPriceZAR: 59616.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Gordons Premium Pink', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Gordons Premium Pink', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1152.00, palletPackQty: 60, palletPriceZAR: 66240.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Gordons London Dry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Gordons London Dry', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1094.40, palletPackQty: 60, palletPriceZAR: 62928.00, supplierPortfolio: 'Diageo SA' },
  { name: 'KEM Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Local Craft' },
  { name: 'Kwande Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3225.60, palletPackQty: 60, palletPriceZAR: 185472.00, supplierPortfolio: 'Local Craft' },
  { name: 'Royal Flush Premium', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2304.00, palletPackQty: 60, palletPriceZAR: 132480.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Royal Flush Premium', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1267.20, palletPackQty: 60, palletPriceZAR: 72864.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Tanqueray London Dry Export', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4147.20, palletPackQty: 60, palletPriceZAR: 238464.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Tanqueray London Dry Export', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2246.40, palletPackQty: 60, palletPriceZAR: 129168.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Tanqueray No. TEN', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5551.20, palletPackQty: 60, palletPriceZAR: 319194.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Tanqueray Flor de Sevilla', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4147.20, palletPackQty: 60, palletPriceZAR: 238464.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Hendrick\'s Original', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5184.00, palletPackQty: 60, palletPriceZAR: 298080.00, supplierPortfolio: 'William Grant & Sons' },
  { name: 'Hendrick\'s Original', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'William Grant & Sons' },
  { name: 'Bombay Sapphire', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3571.20, palletPackQty: 60, palletPriceZAR: 205344.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Bombay Sapphire', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Inverroche Classic', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4147.20, palletPackQty: 60, palletPriceZAR: 238464.00, supplierPortfolio: 'Local Craft' },
  { name: 'Inverroche Amber/Verdant', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4492.80, palletPackQty: 60, palletPriceZAR: 258336.00, supplierPortfolio: 'Local Craft' },
  { name: 'Musgrave Pink', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3340.80, palletPackQty: 60, palletPriceZAR: 192096.00, supplierPortfolio: 'Local Craft' },
  { name: 'Flowstone African Bush Botanical', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3571.20, palletPackQty: 60, palletPriceZAR: 205344.00, supplierPortfolio: 'Local Craft' },
  { name: 'Cruxland Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3686.40, palletPackQty: 60, palletPriceZAR: 211968.00, supplierPortfolio: 'Local Craft' },
  { name: 'Wixworth Gin', category: 'GIN', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3225.60, palletPackQty: 60, palletPriceZAR: 185472.00, supplierPortfolio: 'Local Craft' },
  { name: 'Belvedere Pure Vodka', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5529.60, palletPackQty: 60, palletPriceZAR: 317952.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Belvedere Pure Vodka', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2995.20, palletPackQty: 60, palletPriceZAR: 172224.00, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Ciroc Original Premium', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4838.40, palletPackQty: 60, palletPriceZAR: 278208.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Ciroc Original Premium', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 2649.60, palletPackQty: 60, palletPriceZAR: 152352.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Ciroc (Apple/Mango/Pineapple)', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5068.80, palletPackQty: 60, palletPriceZAR: 291456.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Smirnoff Red No. 21', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1843.20, palletPackQty: 60, palletPriceZAR: 105984.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Smirnoff Red No. 21', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1036.80, palletPackQty: 60, palletPriceZAR: 59616.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Smirnoff Infusions', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Russian Bear Standard', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1612.80, palletPackQty: 60, palletPriceZAR: 92736.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Russian Bear Standard', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 921.60, palletPackQty: 60, palletPriceZAR: 52992.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Russian Bear Flavours', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1612.80, palletPackQty: 60, palletPriceZAR: 92736.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Wyborowa Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Wyborowa Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1152.00, palletPackQty: 60, palletPriceZAR: 66240.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Grey Goose Luxury', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 6336.00, palletPackQty: 60, palletPriceZAR: 364320.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Grey Goose Luxury', category: 'VODKA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 3456.00, palletPackQty: 60, palletPriceZAR: 198720.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Absolut Original Blue', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2649.60, palletPackQty: 60, palletPriceZAR: 152352.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Absolut Original Blue', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1440.00, palletPackQty: 60, palletPriceZAR: 82800.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Absolut (Watermelon/Lime/Citron)', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2764.80, palletPackQty: 60, palletPriceZAR: 158976.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Cruz Vintage Black Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2534.40, palletPackQty: 60, palletPriceZAR: 145728.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Cruz Vintage Black Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1382.40, palletPackQty: 60, palletPriceZAR: 79488.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Skyy Vodka Original', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2419.20, palletPackQty: 60, palletPriceZAR: 139104.00, supplierPortfolio: 'Campari Group' },
  { name: 'Skyy Vodka Original', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1324.80, palletPackQty: 60, palletPriceZAR: 76176.00, supplierPortfolio: 'Campari Group' },
  { name: 'Count Pushkin Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1497.60, palletPackQty: 60, palletPriceZAR: 86112.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Count Pushkin Vodka', category: 'VODKA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 864.00, palletPackQty: 60, palletPriceZAR: 49680.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Olmeca Plata', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3225.60, palletPackQty: 60, palletPriceZAR: 185472.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Olmeca Plata', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1843.20, palletPackQty: 60, palletPriceZAR: 105984.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Olmeca Reposado', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3340.80, palletPackQty: 60, palletPriceZAR: 192096.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Olmeca Reposado', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1900.80, palletPackQty: 60, palletPriceZAR: 109296.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Jose Cuervo Especial Silver', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Jose Cuervo Especial Silver', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1612.80, palletPackQty: 60, palletPriceZAR: 92736.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Jose Cuervo Especial Reposado', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2995.20, palletPackQty: 60, palletPriceZAR: 172224.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Jose Cuervo Especial Reposado', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1670.40, palletPackQty: 60, palletPriceZAR: 96048.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Aljimardo Silver', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2304.00, palletPackQty: 60, palletPriceZAR: 132480.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Aljimardo Silver', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1267.20, palletPackQty: 60, palletPriceZAR: 72864.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Don Julio Blanco', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 7142.40, palletPackQty: 60, palletPriceZAR: 408456.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Don Julio Reposado', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 8524.80, palletPackQty: 60, palletPriceZAR: 487512.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Patron Silver Luxury', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9792.00, palletPackQty: 60, palletPriceZAR: 559980.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Patron Reposado', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 11289.60, palletPackQty: 60, palletPriceZAR: 645624.00, supplierPortfolio: 'Bacardi SA' },
  { name: 'Clase Azul Plata', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 32292.00, palletPackQty: 60, palletPriceZAR: 1846698.75, supplierPortfolio: 'Global Premium Import' },
  { name: 'Clase Azul Reposado', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 48600.00, palletPackQty: 60, palletPriceZAR: 2779312.50, supplierPortfolio: 'Global Premium Import' },
  { name: 'Casamigos Blanco', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 8294.40, palletPackQty: 60, palletPriceZAR: 474336.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Casamigos Reposado', category: 'TEQUILA_PREMIUM', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 9792.00, palletPackQty: 60, palletPriceZAR: 559980.00, supplierPortfolio: 'Diageo SA' },
  { name: 'El Jimador Blanco/Reposado', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2764.80, palletPackQty: 60, palletPriceZAR: 158976.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Ponchos Blanco/Caramel Tequila', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Ponchos Blanco/Caramel Tequila', category: 'TEQUILA', productType: 'ALCOHOL', bottleFormat: '375ml Bottle', unitsPerCase: 12, casePriceZAR: 1152.00, palletPackQty: 60, palletPriceZAR: 66240.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Blue Curacao (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2534.40, palletPackQty: 60, palletPriceZAR: 145728.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Blue Curacao (Peddler\'s)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2764.80, palletPackQty: 60, palletPriceZAR: 158976.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Blue Curacao Generic', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 979.20, palletPackQty: 60, palletPriceZAR: 56304.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Triple Sec (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2361.60, palletPackQty: 60, palletPriceZAR: 135792.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Triple Sec (Peddler\'s)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2764.80, palletPackQty: 60, palletPriceZAR: 158976.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Triple Sec Premium (San Basile)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 5529.60, palletPackQty: 60, palletPriceZAR: 317952.00, supplierPortfolio: 'Local Craft' },
  { name: 'Peach Schnapps (Relic)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2361.60, palletPackQty: 60, palletPriceZAR: 135792.00, supplierPortfolio: 'Local Craft' },
  { name: 'Peach Schnapps (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Peach Schnapps Generic', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1036.80, palletPackQty: 60, palletPriceZAR: 59616.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Strawberry Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Strawberry Liqueur Generic', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1152.00, palletPackQty: 60, palletPriceZAR: 66240.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Peppermint Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Banana Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Cherry Kirsch Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2419.20, palletPackQty: 60, palletPriceZAR: 139104.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Espresso/Coffee Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Ginger Liqueur (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Van Der Hum Tangerine (Butlers)', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Amarula Original Cream', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Amarula Ethiopian Coffee', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.80, palletPackQty: 60, palletPriceZAR: 125856.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Baileys Original Irish Cream', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Diageo SA' },
  { name: 'Jagermeister Herbal Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3686.40, palletPackQty: 60, palletPriceZAR: 211968.00, supplierPortfolio: 'Jagermeister AG' },
  { name: 'Sambuca Lupini Black/Gold', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1958.40, palletPackQty: 60, palletPriceZAR: 112608.00, supplierPortfolio: 'Edward Snell & Co.' },
  { name: 'Sambuca Generic Blue/White', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1612.80, palletPackQty: 60, palletPriceZAR: 92736.00, supplierPortfolio: 'Local Value Brand' },
  { name: 'Tequila Rose Cream Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2304.00, palletPackQty: 60, palletPriceZAR: 132480.00, supplierPortfolio: 'Global Premium Import' },
  { name: 'Strawberry Lips', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1612.80, palletPackQty: 60, palletPriceZAR: 92736.00, supplierPortfolio: 'DGB Portfolio' },
  { name: 'Cointreau Orange Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3686.40, palletPackQty: 60, palletPriceZAR: 211968.00, supplierPortfolio: 'Spirits SA Import' },
  { name: 'Grand Marnier Cordon Rouge', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 4492.80, palletPackQty: 60, palletPriceZAR: 258336.00, supplierPortfolio: 'Campari Group' },
  { name: 'Cape Velvet Cream', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1497.60, palletPackQty: 60, palletPriceZAR: 86112.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Tia Maria Coffee Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2534.40, palletPackQty: 60, palletPriceZAR: 145728.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Frangelico Hazelnut Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2995.20, palletPackQty: 60, palletPriceZAR: 172224.00, supplierPortfolio: 'Campari Group' },
  { name: 'Disaronno Amaretto Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3456.00, palletPackQty: 60, palletPriceZAR: 198720.00, supplierPortfolio: 'Spirits SA Import' },
  { name: 'Malibu Coconut Rum Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2073.60, palletPackQty: 60, palletPriceZAR: 119232.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Kahlua Coffee Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2880.00, palletPackQty: 60, palletPriceZAR: 165600.00, supplierPortfolio: 'Pernod Ricard' },
  { name: 'Drambuie Honey/Scotch', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 3686.40, palletPackQty: 60, palletPriceZAR: 211968.00, supplierPortfolio: 'Spirits SA Import' },
  { name: 'Chambord Black Raspberry', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '500ml Bottle', unitsPerCase: 12, casePriceZAR: 4377.60, palletPackQty: 60, palletPriceZAR: 251712.00, supplierPortfolio: 'Global Premium Import' },
  { name: 'Nachtmusik Chocolate Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1497.60, palletPackQty: 60, palletPriceZAR: 86112.00, supplierPortfolio: 'Distell Portfolio' },
  { name: 'Wild Africa Cream Liqueur', category: 'LIQUEUR', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 1382.40, palletPackQty: 60, palletPriceZAR: 79488.00, supplierPortfolio: 'KWV Spirits' },
  { name: 'Grenadine Syrup Cordial', category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '1 Litre Jug', unitsPerCase: 12, casePriceZAR: 823.20, palletPackQty: 60, palletPriceZAR: 47880.00, supplierPortfolio: 'Bar Mixer Supply' },
  { name: 'Lime/Passion Fruit Cordial', category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 529.20, palletPackQty: 60, palletPriceZAR: 30780.00, supplierPortfolio: 'Tiger Brands (Roses)' },
  { name: 'Kola Tonic Cordial', category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 529.20, palletPackQty: 60, palletPriceZAR: 30780.00, supplierPortfolio: 'Tiger Brands (Roses)' },
  { name: 'Maraschino Cherries (Syrup)', category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '350ml Jar', unitsPerCase: 12, casePriceZAR: 705.60, palletPackQty: 60, palletPriceZAR: 41040.00, supplierPortfolio: 'Bar Mixer Supply' },
  { name: 'Angostura Aromatic Bitters', category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '200ml Bottle', unitsPerCase: 12, casePriceZAR: 1058.40, palletPackQty: 60, palletPriceZAR: 61560.00, supplierPortfolio: 'House of Angostura' },
  { name: '4th Street Sweet Red/White', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 285.00, palletPackQty: 100, palletPriceZAR: 27000.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Robertson Winery Sweet Merlot', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 370.50, palletPackQty: 100, palletPriceZAR: 35100.00, supplierPortfolio: 'Robertson Winery' },
  { name: 'Drostdy-Hof Adelpracht Sweet', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 342.00, palletPackQty: 100, palletPriceZAR: 32400.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Nederburg Baronne', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 484.50, palletPackQty: 100, palletPriceZAR: 45900.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Nederburg Sauvignon Blanc', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 456.00, palletPackQty: 100, palletPriceZAR: 43200.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Kanonkop Kadette Cabernet', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 798.00, palletPackQty: 100, palletPriceZAR: 75600.00, supplierPortfolio: 'Kanonkop Wine Estate' },
  { name: 'Beyerskloof Pinotage', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 627.00, palletPackQty: 100, palletPriceZAR: 59400.00, supplierPortfolio: 'Beyerskloof Estate' },
  { name: 'Saint Raphael Sweet Red', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 313.50, palletPackQty: 100, palletPriceZAR: 29700.00, supplierPortfolio: 'DGB Portfolio' },
  { name: 'Castillo de Liria Sweet Red', category: 'WINE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 427.50, palletPackQty: 100, palletPriceZAR: 40500.00, supplierPortfolio: 'Premium Wine Imports' },
  { name: 'JC Le Roux Le Domaine', category: 'SPARKLING', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 570.00, palletPackQty: 100, palletPriceZAR: 54000.00, supplierPortfolio: 'Heineken SA' },
  { name: 'JC Le Roux La Fleurette', category: 'SPARKLING', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 570.00, palletPackQty: 100, palletPriceZAR: 54000.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Krone Borealis Brut (MCC)', category: 'SPARKLING', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 1197.00, palletPackQty: 100, palletPriceZAR: 113400.00, supplierPortfolio: 'Vinimark Portfolio' },
  { name: 'Pongracz Brut', category: 'SPARKLING', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 1083.00, palletPackQty: 100, palletPriceZAR: 102600.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Moet & Chandon Imperial Brut', category: 'CHAMPAGNE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 3942.00, palletPackQty: 100, palletPriceZAR: 373452.63, supplierPortfolio: 'Moet Hennessy' },
  { name: 'Veuve Clicquot Yellow Label', category: 'CHAMPAGNE', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 6, casePriceZAR: 4590.00, palletPackQty: 100, palletPriceZAR: 434842.11, supplierPortfolio: 'Moet Hennessy' },
  { name: '4th Street Sweet Red/Rose', category: 'WINE_BOX', productType: 'ALCOHOL', bottleFormat: '5 Litre Box', unitsPerCase: 4, casePriceZAR: 652.80, palletPackQty: 75, palletPriceZAR: 46920.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Robertson Winery Smooth Red', category: 'WINE_BOX', productType: 'ALCOHOL', bottleFormat: '3 Litre Box', unitsPerCase: 4, casePriceZAR: 518.40, palletPackQty: 75, palletPriceZAR: 37260.00, supplierPortfolio: 'Robertson Winery' },
  { name: 'Drostdy-Hof Claret Select', category: 'WINE_BOX', productType: 'ALCOHOL', bottleFormat: '5 Litre Box', unitsPerCase: 4, casePriceZAR: 729.60, palletPackQty: 75, palletPriceZAR: 52440.00, supplierPortfolio: 'Heineken SA' },
  { name: 'Paarl Perle White', category: 'WINE_BOX', productType: 'ALCOHOL', bottleFormat: '2 Litre Co-Pack', unitsPerCase: 4, casePriceZAR: 326.40, palletPackQty: 75, palletPriceZAR: 23460.00, supplierPortfolio: 'Distell Portfolio' },

  // ---- Ceremony provisioning: real, purchasable versions of the
  // physical items in ceremonyCostProfiles.js, so "buy this" on a
  // ceremony checklist adds a real product to the basket, not just an
  // estimate. bottleFormat is always null here (not alcohol), and
  // unitsPerCase is 1 — for these, one "case" is one unit.
  { name: 'Ikoto (Bentonite Clay)', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 65.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Imphepho Bundle', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 45.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Plain Grey Blanket', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'White Blanket with Black Stripes', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 450.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Tarpaulin Sail', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: 'Ibhoma Pole Bundle', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 450.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: '25L Water Container', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 180.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Green Apples', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Butter', category: 'GROCERY', productType: 'FOOD', bottleFormat: '1kg', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Sheep', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sheep', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },

  // ---- Umgidi catering: real, purchasable grocery quantities that
  // scale with guest count (see ceremonyCostProfiles.js perGuestUnitFraction).
  { name: 'Maize Meal', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '50kg Bag', unitsPerCase: 1, casePriceZAR: 520.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Maize Meal', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Maize Meal', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Amazimba', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Amazimba', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Umbona', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Umbona', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Samp', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Samp', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Rice', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Rice', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Mayonnaise', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Mayonnaise', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Chutney', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Chutney', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Sweet Chilli Sauce', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Sweet Chilli Sauce', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Potatoes', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: '10kg Sack', unitsPerCase: 1, casePriceZAR: 110.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Cabbage', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Spinach', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk Bunches)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Yellow Peppers', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Sweet Corn', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Cooking Oil', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5L', unitsPerCase: 1, casePriceZAR: 190.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Sugar', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: 245.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Sugar', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Wholesaler' },
  { name: 'Beef Stock', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: 'Box', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Salt', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: 'Box', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Chicken Trays', category: 'MEAT', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher' },
  { name: 'Chicken Legs', category: 'MEAT', productType: 'FOOD', bottleFormat: 'Sack (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher' },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Valpre Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Valpre Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: null },

  // ---- Catalogue expansion: not everybody drinks alcohol, and not every
  // bulk-buying pool is for a ceremony. Real non-alcoholic beverages, real
  // meat cuts, and general livestock, priced below a genuine researched
  // retail comparable (retailPriceZAR). Live animals have no honest
  // supermarket comparable, so retailPriceZAR stays null for those —
  // never a fabricated "savings" figure.
  { name: 'Coca-Cola', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (250ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA' },
  { name: 'Sprite', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (250ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA' },
  { name: 'Fanta Orange', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (250ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA' },
  { name: 'Stoney Ginger Beer', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (250ml)', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA' },
  { name: 'Valpre Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: 246.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 383.76 },
  { name: 'Beef Mince 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 574.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 699.95 },
  { name: 'Whole Chicken', category: 'MEAT', productType: 'FOOD', bottleFormat: 'Box (Bulk, ~1.8kg each bird)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher' },
  { name: 'Boerewors 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 474.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 554.95 },
  { name: 'Goat', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Goat', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sybok', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sybok', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Inkomo / Cow', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 17000.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Inkomo / Cow', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 17000.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },

  // ---- Veggies: the ceremony vegetables and sides list — matches
  // ceremonyCostProfiles.js COST_RATES.food exactly (same real prices),
  // now actually purchasable in the Store instead of just an estimate.
  { name: 'Onions', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: '10kg Sack', unitsPerCase: 1, casePriceZAR: 95.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Carrots', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: '10kg Sack', unitsPerCase: 1, casePriceZAR: 95.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Green Peppers', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Red Peppers', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Baked Beans', category: 'CANNED_GOODS', productType: 'FOOD', bottleFormat: '3kg Tin', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Baked Beans', category: 'CANNED_GOODS', productType: 'FOOD', bottleFormat: 'Pack of 24 x 410g Tins', unitsPerCase: 24, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },

  // ---- Dry goods / hospitality staples: already-researched prices that
  // were sitting in ceremonyCostProfiles.js but never turned into
  // purchasable Sku rows.
  { name: 'Instant Coffee', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: '750g Big Tin', unitsPerCase: 1, casePriceZAR: 165.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Tea', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: '1kg Box', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  // Bread and peanut butter stay single-consumer-sized on purpose — the
  // founder's own exception for anything bought from a local vendor rather
  // than a bulk wholesaler.
  { name: 'Peanut Butter 400g', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 50.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Brown Bread Loaf', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 20.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Milk Long Life', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: '1L x 6-Pack', unitsPerCase: 6, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Flour', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Flour', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
];

const samplePartners = [
  { name: 'Speakeasy Tavern', type: 'TAVERN', area: 'Motherwell', moq: 50 },
  { name: "Coke's Tavern", type: 'TAVERN', area: 'Motherwell', moq: 40 },
];

const practitionerSeeds = [
  { name: 'Bhut\' Sizwe Ingcibi Services', role: 'INGCIBI', area: 'Gugulethu', contactInfo: '021 555 0101' },
  { name: 'Mama Noku Ikhankatha Care', role: 'IKHANKATHA', area: 'Khayelitsha', contactInfo: '021 555 0102' },
  { name: 'Tata Zola Traditional Guidance', role: 'CULTURAL_ADVISOR', area: 'Motherwell', contactInfo: '041 555 0103' },
  { name: 'Nkosi Ingcibi Practice', role: 'INGCIBI', area: 'Mdantsane', contactInfo: '043 555 0104' },
];

const vendorSeeds = [
  { name: 'Makro Liquor', category: 'LIQUOR_SUPPLIER', area: 'South Africa', description: 'Major liquor retail/wholesale source for catalogue and partner sourcing.' },
  { name: "Preston's", category: 'LIQUOR_SUPPLIER', area: 'South Africa', description: 'Liquor retail source for vendor discovery and sourcing.' },
  { name: 'Navada', category: 'IKRWALA_CLOTHING', area: 'South Africa', description: 'Clothing/formalwear source relevant to Ikrwala preparation.' },
  { name: 'Grasshopper', category: 'IKRWALA_CLOTHING', area: 'South Africa', description: 'Clothing source relevant to Ikrwala preparation.' },
  { name: 'Delbro', category: 'FORMALWEAR', area: 'South Africa', description: 'Formalwear source for ceremony preparation.' },
];

const legendEntries = [
  // HISTORY — Royalty & Resistance
  { title: 'King Xhosa', bodyText: 'The progenitor of the nation, which takes its name from him. His descendants became one of the largest Nguni-speaking nations in Southern Africa.', category: 'HISTORY', isFeatured: false },
  { title: 'King Phalo', bodyText: 'Under his reign the nation split into two great houses: amaRharhabe (west of the Kei River) and amaGcaleka (east of the Kei) — a division that shaped Xhosa political geography for centuries.', category: 'HISTORY', isFeatured: false },
  { title: 'King Rharhabe', bodyText: 'Founder of the Rharhabe branch (1722-1787). His descendants — Ndlambe, Ngqika, Sandile, and Maqoma — would lead the resistance against colonial expansion.', category: 'HISTORY', isFeatured: false },
  { title: 'King Hintsa ka Khawuta', bodyText: 'A symbol of dignity and resistance. Shot while in British custody during the Sixth Frontier War, his death became a rallying cry for Xhosa nationalism.', category: 'HISTORY', isFeatured: true },
  { title: 'Chief Maqoma', bodyText: 'One of the greatest military strategists in South African history. He led the unified Xhosa attack of 1834 and was imprisoned twice on Robben Island, where he died in 1873.', category: 'HISTORY', isFeatured: true },
  { title: 'King Sandile', bodyText: 'Paramount chief of the Rharhabe, mortally wounded in 1878. His courage in resisting colonial expansion was never vanquished.', category: 'HISTORY', isFeatured: false },
  { title: 'King Ngangelizwe', bodyText: 'A Thembu king who navigated complex diplomatic relationships with both the British and the Zulu through strategic marriages.', category: 'HISTORY', isFeatured: false },
  { title: 'King Sarhili (Kreli)', bodyText: 'Paramount chief during the Cattle-Killing Movement of 1856-1857, a moment of existential crisis for the Xhosa nation.', category: 'HISTORY', isFeatured: false },
  { title: 'Nxele (Makhanda)', bodyText: 'Led a 10,000-strong Xhosa force against Grahamstown in 1819. The city, now renamed Makhanda, bears his name in his honour.', category: 'HISTORY', isFeatured: true },
  { title: 'Nongqawuse', bodyText: 'At just 15, her prophecies led to the Cattle-Killing Movement of 1856-1857 — the earliest mass passive resistance movement in South Africa, born of a people facing existential collapse.', category: 'HISTORY', isFeatured: false },
  { title: 'The Cape Frontier Wars', bodyText: 'The Cape Frontier Wars (1779-1879) between the Xhosa and colonial forces are widely documented as the longest-running military conflict in the history of colonialism in Africa.', category: 'HISTORY', isFeatured: true },

  // FAITH
  { title: 'Ntsikana', bodyText: 'The first Xhosa prophet to indigenize Christianity, composing hymns in isiXhosa still sung today as a spiritual national anthem.', category: 'FAITH', isFeatured: false },
  { title: 'Tiyo Soga', bodyText: 'The first Xhosa person ordained as a Christian minister. Translated The Pilgrim\'s Progress into isiXhosa.', category: 'FAITH', isFeatured: false },
  { title: 'John Knox Bokwe', bodyText: 'Xhosa musician and composer who preserved Ntsikana\'s hymns in written form, ensuring his spiritual legacy survived into the modern era.', category: 'FAITH', isFeatured: false },
  { title: 'Nontetha Nkwenkwe', bodyText: 'A Xhosa woman prophet who mobilized her people spiritually against colonial oppression after WWI — seen as a threat to British rule.', category: 'FAITH', isFeatured: false },

  // ACADEMIA — Literature & Education
  { title: 'S.E.K. Mqhayi', bodyText: 'Known as "the Poet of the Nation, Everywhere," he standardized Xhosa grammar and wrote the first Xhosa novel.', category: 'ACADEMIA', isFeatured: false },
  { title: 'A.C. Jordan', bodyText: 'Wrote Ingqumbo yeminyanya (The Wrath of the Ancestors), a cornerstone of Xhosa literature bridging oral tradition and the modern novel.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Walter Rubusana', bodyText: 'Published one of the earliest Xhosa literary anthologies in 1906, and became the first Black person elected to the Cape Provincial Council in 1910.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Charlotte Maxeke', bodyText: 'The first Black South African woman to earn a university degree, in 1901. A leader in education, women\'s rights, and the ANC.', category: 'ACADEMIA', isFeatured: true },
  { title: 'Dr. A.B. Xuma', bodyText: 'The first Black South African to qualify as a medical doctor in the USA, and later president of the ANC (1940-1949).', category: 'ACADEMIA', isFeatured: false },
  { title: 'Prof. D.D.T. Jabavu', bodyText: 'The first Black professor in South Africa, taught at Fort Hare University.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Prof. Z.K. Matthews', bodyText: 'Academic and ANC leader whose call for a "Congress of the People" led directly to the Freedom Charter.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Cecilia Makiwane', bodyText: 'The first Black registered professional nurse in South Africa.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Dr. Mary Malahlela', bodyText: 'The first Black woman to qualify as a medical doctor in South Africa.', category: 'ACADEMIA', isFeatured: false },
  { title: 'Hamilton Naki', bodyText: 'A self-taught surgeon who worked alongside Christiaan Barnard on the world\'s first heart transplant, and trained generations of surgeons despite having no formal medical education.', category: 'ACADEMIA', isFeatured: true },

  // LEADERSHIP
  { title: 'Nelson Mandela', bodyText: 'A Thembu royal descendant who became a global symbol of justice, spending 27 years imprisoned before becoming South Africa\'s first Black president.', category: 'LEADERSHIP', isFeatured: true },
  { title: 'Oliver Tambo', bodyText: 'Built global support for the liberation struggle while leading the ANC in exile for three decades.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Chris Hani', bodyText: 'Leader of the South African Communist Party and Umkhonto weSizwe, whose 1993 assassination nearly derailed the democratic transition.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Thabo Mbeki', bodyText: 'Second president of democratic South Africa, and champion of the African Renaissance.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Steve Bantu Biko', bodyText: 'Founder of the Black Consciousness Movement, born in Ginsberg, Eastern Cape. Taught that mental liberation is the precondition for physical freedom.', category: 'LEADERSHIP', isFeatured: true },
  { title: 'Govan Mbeki', bodyText: 'Key strategist in the ANC and SACP, imprisoned on Robben Island alongside Mandela.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Dr. James Moroka', bodyText: 'Medical doctor who served as ANC president (1949-1952), leading the Defiance Campaign.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Robert Sobukwe', bodyText: 'Founder of the Pan Africanist Congress. His solitary confinement on Robben Island became a symbol of unbreakable resolve.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Winnie Madikizela-Mandela', bodyText: 'Anti-apartheid activist born in Bizana, Eastern Cape, who kept the struggle alive during Mandela\'s imprisonment.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Albertina Sisulu', bodyText: 'Nurse, anti-apartheid activist, and stalwart of the United Democratic Front.', category: 'LEADERSHIP', isFeatured: false },
  { title: 'Desmond Tutu', bodyText: 'Nobel Peace Prize laureate and chair of the Truth and Reconciliation Commission, raised in Xhosa identity and the Eastern Cape.', category: 'LEADERSHIP', isFeatured: false },

  // SPORT
  { title: 'Siya Kolisi', bodyText: 'First Black captain of the Springboks, born in Zwide, Port Elizabeth. Led South Africa to Rugby World Cup victories in 2019 and 2023.', category: 'SPORT', isFeatured: true },
  { title: 'Makhaya Ntini', bodyText: 'First Black African cricketer to play Test cricket for South Africa, born in Mdingi, Eastern Cape.', category: 'SPORT', isFeatured: false },
  { title: 'Makazole Mapimpi', bodyText: 'Springbok winger from Tsholomnqa, Eastern Cape, who scored the first-ever Rugby World Cup final try by a South African, in 2019.', category: 'SPORT', isFeatured: true },
  { title: 'Lukhanyo Am', bodyText: 'Springbok centre from Zwelitsha, East London, widely regarded as one of the best outside centres in world rugby.', category: 'SPORT', isFeatured: false },
  { title: 'Temba Bavuma', bodyText: 'First Black African to score a Test century for South Africa, and captain of the Proteas in limited-overs cricket.', category: 'SPORT', isFeatured: false },
  { title: 'Andile Jali', bodyText: 'Footballer from Matatiele, Eastern Cape — one of the most technically gifted South African players of his generation.', category: 'SPORT', isFeatured: false },
  { title: 'Akona & Odwa Ndungane', bodyText: 'Rugby union twins from Mthatha, Eastern Cape, who both played for the Sharks and represented South Africa.', category: 'SPORT', isFeatured: false },
  { title: 'Gcobani Bobo', bodyText: 'Rugby centre from Grahamstown/Makhanda, Eastern Cape, known for his creative, attacking style for the Springboks.', category: 'SPORT', isFeatured: false },
  { title: 'Jongi Nokwe', bodyText: 'Springbok winger from Nqamakwe, Eastern Cape, one of the fastest players to wear the green and gold.', category: 'SPORT', isFeatured: false },

  // ARTS
  { title: 'Miriam Makeba', bodyText: '"Mama Africa" — Grammy-winning singer and anti-apartheid activist, the first African artist to win a Grammy.', category: 'ARTS', isFeatured: true },
  { title: 'Brenda Fassie', bodyText: 'The "Madonna of the Townships," a fearless cultural icon born in Langa, Cape Town.', category: 'ARTS', isFeatured: false },
  { title: 'Hugh Masekela', bodyText: 'Jazz legend whose trumpet became the soundtrack of the anti-apartheid struggle, with deep Xhosa roots from the Eastern Cape.', category: 'ARTS', isFeatured: false },
  { title: 'John Kani', bodyText: 'Tony Award-winning actor and playwright who voiced King T\'Chaka in Marvel\'s Black Panther, and pushed for isiXhosa to become the official language of the fictional kingdom of Wakanda.', category: 'ARTS', isFeatured: true },
  { title: 'Winston Ntshona', bodyText: 'Tony Award-winning actor and playwright, co-author of seminal anti-apartheid plays with John Kani and Athol Fugard.', category: 'ARTS', isFeatured: false },
  { title: 'Zahara', bodyText: 'Afro-soul sensation from Phumlani, Eastern Cape, whose isiXhosa and English music touched millions across Africa.', category: 'ARTS', isFeatured: false },
  { title: 'Black Coffee', bodyText: 'Grammy-winning DJ and producer born in Mthatha, one of the most successful African electronic music artists in the world.', category: 'ARTS', isFeatured: false },
  { title: 'Simphiwe Dana', bodyText: 'Jazz and Afro-soul vocalist from Butterworth, Eastern Cape, known for her powerful voice and socially conscious lyrics.', category: 'ARTS', isFeatured: false },
  { title: 'Thandiswa Mazwai', bodyText: 'Singer and cultural activist carrying the torch of Xhosa musical tradition into the contemporary era.', category: 'ARTS', isFeatured: false },
  { title: 'Trevor Noah', bodyText: 'Host of The Daily Show, born to a Xhosa mother — one of the most influential African voices in global media.', category: 'ARTS', isFeatured: false },
  { title: 'Atandwa Kani', bodyText: 'Actor and director, son of John Kani, continuing the family legacy on stage and screen.', category: 'ARTS', isFeatured: false },
  { title: 'Laduma Ngxokolo', bodyText: 'Founder of MaXhosa Africa, who redefined traditional Xhosa beadwork patterns into globally recognized luxury knitwear.', category: 'ARTS', isFeatured: true },

  // GLOBAL IMPACT
  { title: 'Zozibini Tunzi', bodyText: 'Miss Universe 2019, born in Tsolo, Eastern Cape, who inspired the world by embracing natural African beauty and advocating leadership over appearance.', category: 'LEADERSHIP', isFeatured: true },
];

const clanSeeds = [
  { male: "Cirha", female: "MamCirha", canonical: "AmaCirha" },
  { male: "Tshawe", female: "MamTshawe", canonical: "AmaTshawe" },
  { male: "Jwarha", female: "MamJwarha", canonical: "AmaJwarha" },
  { male: "Mpinga", female: "MamMpinga", canonical: "AmaMpinga" },
  { male: "Gcina", female: "MamGcina", canonical: "AmaGcina" },
  { male: "Sukwini", female: "MamSukwini", canonical: "AmaSukwini" },
  { male: "Gaba", female: "MamGaba", canonical: "AmaGaba" },
  { male: "Tshezi", female: "MamTshezi", canonical: "AmaTshezi" },
  { male: "Giqwa", female: "MamGiqwa", canonical: "AmaGiqwa" },
  { male: "Mfene", female: "MamMfene", canonical: "AmaMfene" },
  { male: "Kwayi", female: "MamKwayi", canonical: "AmaKwayi" },
  { male: "Gqwashu", female: "MamGqwashu", canonical: "AmaGqwashu" },
  { male: "Ndlambe", female: "MamNdlambe", canonical: "AmaNdlambe" },
  { male: "Zizi", female: "MamZizi", canonical: "AmaZizi" },
  { male: "Bhele", female: "MamBhele", canonical: "AmaBhele" },
  { male: "Hlubi", female: "MamHlubi", canonical: "AmaHlubi" },
  { male: "Mqwathi", female: "MamMqwathi", canonical: "AmaMqwathi" },
  { male: "Madiba", female: "MamMadiba", canonical: "AmaMadiba" },
  { male: "Dlomo", female: "MamDlomo", canonical: "AmaDlomo" },
  { male: "Khiwa", female: "MamKhiwa", canonical: "AmaKhiwa" },
  { male: "Zangwa", female: "MamZangwa", canonical: "AmaZangwa" },
  { male: "Zangwe", female: "MamZangwe", canonical: "AmaZangwe" },
  { male: "Xesibe", female: "MamXesibe", canonical: "AmaXesibe" },
  { male: "Mpondo", female: "MamMpondo", canonical: "AmaMpondo" },
  { male: "Mpondomise", female: "MamMpondomise", canonical: "AmaMpondomise" },
  { male: "Cabe", female: "MamCabe", canonical: "AmaCabe" },
  { male: "Shweme", female: "MamShweme", canonical: "AmaShweme" },
  { male: "Ngcolosi", female: "MamNgcolosi", canonical: "AmaNgcolosi" },
  { male: "Rhadebe", female: "MamRhadebe", canonical: "AmaRhadebe" },
  { male: "Mvulane", female: "MamMvulane", canonical: "AmaMvulane" },
  { male: "Tholo", female: "MamTholo", canonical: "AmaTholo" },
  { male: "Ntshilibe", female: "MamNtshilibe", canonical: "AmaNtshilibe" },
  { male: "Kwemnta", female: "MamKwemnta", canonical: "AmaKwemnta" },
  { male: "Qocwa", female: "MamQocwa", canonical: "AmaQocwa" },
  { male: "Goduka", female: "MamGoduka", canonical: "AmaGoduka" },
  { male: "Mdlane", female: "MamMdlane", canonical: "AmaMdlane" },
  { male: "Nqane", female: "MamNqane", canonical: "AmaNqane" },
  { male: "Mkhwane", female: "MamMkhwane", canonical: "AmaMkhwane" },
  { male: "Ngwanya", female: "MamNgwanya", canonical: "AmaNgwanya" },
  { male: "Nala", female: "MamNala", canonical: "AmaNala" },
];

async function main() {
  console.log(`Seeding ${skuItems.length} SKUs...`);
  for (const item of skuItems) {
    await upsertSkuByNameAndBottleFormat(prisma, item, {
      casePriceZAR: item.casePriceZAR,
      palletPriceZAR: item.palletPriceZAR,
      retailPriceZAR: item.retailPriceZAR ?? null,
    });
  }
  console.log('SKU catalogue seeded.');

  console.log('Seeding sample partners...');
  for (const partner of samplePartners) {
    const existing = await prisma.partner.findFirst({ where: { name: partner.name } });
    if (!existing) {
      await prisma.partner.create({ data: partner });
    }
  }
  console.log('Sample partners seeded.');

  console.log('Seeding vendor sources...');
  for (const vendor of vendorSeeds) {
    const existing = await prisma.vendor.findFirst({ where: { name: vendor.name, area: vendor.area } });
    if (!existing) await prisma.vendor.create({ data: vendor });
  }
  console.log('Vendor sources seeded.');

  console.log('Seeding practitioner directory...');
  for (const practitioner of practitionerSeeds) {
    const existing = await prisma.practitioner.findFirst({ where: { name: practitioner.name } });
    if (!existing) await prisma.practitioner.create({ data: practitioner });
  }
  console.log('Practitioner directory seeded.');

  console.log('Seeding legend entries...');
  for (const legend of legendEntries) {
    const existing = await prisma.legendEntry.findFirst({ where: { title: legend.title } });
    if (!existing) {
      // Seeded legends are curated content, not user submissions — mark verified
      // so they're eligible for the home dashboard's "Did You Know?" card.
      await prisma.legendEntry.create({ data: { ...legend, verificationStatus: 'VERIFIED', reviewedAt: new Date() } });
    }
  }
  console.log('Legend entries seeded.');

  console.log('Registering clan aliases...');
  const { registerClanAlias } = await import('../server/services/izidukoService.js');

  // Hard‑coded sample aliases (keep as you had)
  await registerClanAlias('MamCirha', 'AmaCirha');
  await registerClanAlias('Cirha', 'AmaCirha');

  for (const seed of clanSeeds) {
    await registerClanAlias(seed.male, seed.canonical);
    await registerClanAlias(seed.female, seed.canonical);
  }
  console.log(`Registered ${clanSeeds.length * 2} clan aliases across ${clanSeeds.length} clans.`);

  console.log('All seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });