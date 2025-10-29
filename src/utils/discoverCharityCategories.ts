import fetch from 'node-fetch';
import https from 'https';
import { getValidToken } from '../utils/ebayAuth';
import CharityCategory from '../models/CharityCategory.model';

const agent = new https.Agent({ keepAlive: true });
const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';

// 🔍 Category discovery keywords – include '' (empty) for global histogram
const CATEGORY_QUERIES = [
  '', // important: overall seller-level discovery
  'Women',
  'Men',
  'Kids',
  'Shoes',
  'Bags',
  'Jewellery',
  'Books',
  'Home',
  'Furniture',
  'Electronics',
  'Beauty',
  'Sports',
  'Collectables',
  'Toys',
  'DVD',
  'Health',
];

export interface DiscoveredCategory {
  id: string;
  name: string;
  count: number;
}

export async function discoverCharityCategories(
  charityId: string,
  sellerId: string
): Promise<DiscoveredCategory[]> {
  const categoriesMap = new Map<string, DiscoveredCategory>();
  const token = await getValidToken();

  for (const q of CATEGORY_QUERIES) {
    //  hybrid logic: include q only if non-empty
    const baseUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&filter=sellers:{${sellerId}}&limit=1&facet=categoryId`;
    const url = q ? `${baseUrl}&q=${encodeURIComponent(q)}` : baseUrl;

    console.log(
      `🔍 Discovering categories for ${sellerId} via keyword: "${q}"`
    );

    let res;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': market,
        },
        agent,
      });
    } catch (err) {
      console.warn(
        `⚠️ Network error during fetch for ${sellerId}`
      );
      continue;
    }

    if (res.status === 429 || res.status === 503) {
      console.warn(`⚠️ Rate limited (${res.status}) — retrying after 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (!res.ok) {
      console.warn(
        `⚠️ eBay ${res.status} for ${sellerId}: ${await res.text()}`
      );
      continue;
    }

    const data = await res.json();
    const list = data.categoryDistribution || [];

    for (const c of list) {
      if (!c.categoryId || !c.categoryName) continue;
      const existing = categoriesMap.get(c.categoryId);
      if (!existing) {
        categoriesMap.set(c.categoryId, {
          id: c.categoryId,
          name: c.categoryName,
          count: c.count || 0,
        });
      } else {
        // merge counts from multiple queries
        existing.count += c.count || 0;
      }
    }

    await new Promise(r => setTimeout(r, 1500)); // gentle delay between calls
  }

  //  Filter out very low count categories
  const categories = Array.from(categoriesMap.values()).filter(
    c => c.count >= 5
  );

  console.log(
    ` Found ${categories.length} active categories for ${sellerId}`
  );

  //  Upsert to MongoDB
  await CharityCategory.findOneAndUpdate(
    { charityId, seller: sellerId },
    {
      $set: {
        categories,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return categories;
}
