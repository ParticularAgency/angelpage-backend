/* eslint-env node */

import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import https from 'https';
import CharityProduct from '../models/CharityProduct.model';
import Charity from '../models/CharityShop.model';
import { getValidToken, startAutoRefresh } from '../utils/ebayAuth'; // adjust path as needed

startAutoRefresh(); // automatically renew token in background
dotenv.config();

const agent = new https.Agent({ keepAlive: true });
// const token = process.env.EBAY_OAUTH_TOKEN as string;
const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
const campId = process.env.EPN_CAMPID || '123456';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';

const PRE_SELECTED = [
  {
    name: 'British Heart Foundation',
    seller: 'bhf_shops',
    charity_ids: '225971',
  },
  { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918' },
  {
    name: 'Cancer Research UK',
    seller: 'cancerresearchukshop',
    charity_ids: '1089464',
  },
  {
    name: 'British Red Cross',
    seller: 'britishredcross',
    charity_ids: '220949',
  },
  {
    name: 'Children’s Society',
    seller: 'the_childrens_society',
    charity_ids: '221124',
  },
  {
    name: 'Royal British Legion Industries',
    seller: 'theroyalbritishlegion',
    charity_ids: '210063',
  },
  { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868' },
  { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217' },
  { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250' },
  { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267' },
  { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076' },
  { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994' },
];

// simple helper to retry network calls
async function fetchWithRetry(
  url,
  options,
  retries = 3,
  delay = 3000
) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { ...options, agent });
    if (res.status === 429 || res.status === 503) {
      console.warn(`⚠️ ${res.status} from eBay, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      continue;
    }
    return res;
  }
  throw new Error('❌ Too many failed eBay requests.');
}

// fetch latest 100 items per charity
async function fetchLatestCharityProducts(charityId, sellerId) {
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&filter=sellers:{${sellerId}}&sort=newlyListed&limit=200`;
  console.log(`🔍 Fetching latest 100 for ${sellerId}...`);

const token = await getValidToken();
const res = await fetchWithRetry(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-EBAY-C-MARKETPLACE-ID': market,
  },
});

  if (!res.ok) {
    const errText = await res.text();
    console.error(`⚠️ eBay returned ${res.status} for ${sellerId}: ${errText}`);
    return [];
  }

  const data = await res.json();
  const items = data.itemSummaries || [];

  return items.map((p) => {
    const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
    const itemId = p.itemId || (match ? match[1] : p.title);
    const cleanUrl = match
      ? `https://www.ebay.co.uk/itm/${match[1]}`
      : p.itemWebUrl;
    const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${sellerId}`;

    return {
      itemId,
      charitySeller: sellerId,
      title: p.title,
      price: p.price?.value,
      currency: p.price?.currency,
      image: p.image?.imageUrl,
      thumbnailImages: p.thumbnailImages?.map((t) => t.imageUrl) || [],
      additionalImages: p.additionalImages?.map((a) => a.imageUrl) || [],
      categories: p.categories || [],
      category:
        p.categories?.[p.categories.length - 1]?.categoryName || 'Other',
      condition: p.condition || 'Unknown',
      brand: p.brand || 'Unknown',
      seller: p.seller || {},
      buyingOptions: p.buyingOptions || [],
      shippingOptions: p.shippingOptions || [],
      itemLocation: p.itemLocation || {},
      affiliateUrl,
      updatedAt: new Date(),
    };
  });
}

// save and dedupe products
async function saveUniqueProducts() {
  let count = 0;
  for (const product of product) {
    await CharityProduct.findOneAndUpdate(
      { itemId: product.itemId },
      { $set: product },
      { upsert: true, new: true }
    );
    count++;
  }
  console.log(`💾 Upserted ${count} products`);
}

// main runner
(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const charity of PRE_SELECTED) {
    console.log(`\n🎯 Processing ${charity.name}`);

try {
  const products = await fetchLatestCharityProducts(
    charity.charity_ids,
    charity.seller
  );
  console.log(`✅ Fetched ${products.length} latest items for ${charity.name}`);

  // ✅ Deduplicate by itemId
  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.itemId, p])).values()
  );

  await saveUniqueProducts(uniqueProducts);

  // ✅ Update charity info
  await Charity.findOneAndUpdate(
    { seller: charity.seller },
    {
      $set: {
        seller: charity.seller,
        userName: charity.seller,
        totalProducts: uniqueProducts.length,
        lastUpdated: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  console.log(
    `🎉 Saved ${uniqueProducts.length} latest unique products for ${charity.name}`
  );
} catch (err) {
  console.error(`❌ Failed for ${charity.name}: ${err.message}`);
}


    console.log(`⏳ Waiting 10s before next charity...\n`);
    await new Promise(r => setTimeout(r, 10000));
  }

  await mongoose.connection.close();
  console.log('🏁 Done fetching all latest charity products.');
})();
