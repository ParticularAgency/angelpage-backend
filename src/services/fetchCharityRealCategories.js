/* eslint-env node */

import fetch from 'node-fetch';
import https from 'https';
import CharityProduct from '../models/CharityProduct.model';
import Charity from '../models/CharityShop.model';
import { getValidToken } from '../utils/ebayAuth';
import { discoverCharityCategories } from '../utils/discoverCharityCategories';

const agent = new https.Agent({ keepAlive: true });
const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
const campId = process.env.EPN_CAMPID || '123456';

async function fetchProductsByCategory(
  charityId,
  sellerId,
  categoryId,
  categoryName
) {
  const token = await getValidToken();
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?category_ids=${categoryId}&charity_ids=${charityId}&filter=sellers:{${sellerId}}&sort=newlyListed&limit=100`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': market,
    },
    agent,
  });

  if (!res.ok) {
    console.warn(
      `⚠️ eBay ${res.status} for ${categoryName}: ${await res.text()}`
    );
    return [];
  }

  const data = await res.json();
  const items = data.itemSummaries || [];

  return items.map((p) => ({
    itemId: p.itemId,
    title: p.title,
    charitySeller: sellerId,
    categoryId,
    categoryName,
    price: parseFloat(p.price?.value || 0),
    currency: p.price?.currency,
    image: p.image?.imageUrl,
    thumbnailImages: (p.thumbnailImages || []).map((i) => i.imageUrl),
    additionalImages: (p.additionalImages || []).map((i) => i.imageUrl),
    condition: p.condition,
    brand: p.brand,
    itemLocation: p.itemLocation,
    affiliateUrl: `${p.itemWebUrl}?campid=${campId}&customid=${sellerId}`,
    updatedAt: new Date(),
  }));
}

export async function fetchCharityRealCategories(
  sellerId,
  charityId
) {
  console.log(`\n🎯 Discovering and fetching for ${sellerId}`);

  const categories = await discoverCharityCategories(charityId, sellerId);
  let allProducts = [];


  for (const c of categories) {
    const products = await fetchProductsByCategory(
      charityId,
      sellerId,
      c.id,
      c.name
    );
    console.log(`📦 ${products.length} new items in ${c.name}`);
    allProducts.push(...products);
    await new Promise(r => setTimeout(r, 3000));
  }

  const uniqueProducts = Array.from(
    new Map(allProducts.map((p) => [p.itemId, p])).values()
  );

  for (const product of uniqueProducts) {
    await CharityProduct.findOneAndUpdate(
      { itemId: product.itemId },
      { $set: product },
      { upsert: true, new: true }
    );
  }

  await Charity.findOneAndUpdate(
    { seller: sellerId },
    {
      $set: {
        seller: sellerId,
        userName: sellerId,
        totalProducts: uniqueProducts.length,
        lastUpdated: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(
    `💾 Saved ${uniqueProducts.length} unique products for ${sellerId}`
  );
}
