// import mongoose from 'mongoose';
// import fetch, { Response } from 'node-fetch'; // ✅ Fix type
// import dotenv from 'dotenv';
// import https from 'https';
// import Charity from '../models/Charitylists.model';
// import CharityProduct from '../models/CharityProduct.model';

// dotenv.config();

// /* ---------------------------------------------
//    ⚙️ eBay Setup
// --------------------------------------------- */
// const agent = new https.Agent({ keepAlive: true });
// const token = process.env.EBAY_OAUTH_TOKEN as string;
// const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
// const campId = process.env.EPN_CAMPID || '123456';

// /* ---------------------------------------------
//    🎯 Featured Charities
// --------------------------------------------- */
// interface FeaturedCharity {
//   name;
//   seller;
// }

// const FEATURED_CHARITIES: FeaturedCharity[] = [
//   { name: 'British Heart Foundation', seller: 'bhf_shops' },
//   { name: 'Cancer Research UK', seller: 'cancerresearchukshop' },
//   { name: 'Children’s Society', seller: 'the_childrens_society' },
//   { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion' },
//   { name: 'sanse', seller: 'sensecharityretail' },
//   { name: 'Oxfam', seller: 'oxfam_ebay_shop' },
//   { name: 'PDSA', seller: 'pdsa_charity' },
//   { name: "Barnardo's", seller: 'barnardos_charity' },
//   { name: 'British Red Cross', seller: 'britishredcross' },
//   { name: 'Age UK', seller: 'ageuk' },
//   { name: 'Sue Ryder', seller: 'sueryderpre-loved' },
//   { name: 'Marie Curie', seller: 'mariecurietrading' },
// ];

// /* ---------------------------------------------
//    🔁 Helper: Retry-safe Fetch
// --------------------------------------------- */
// async function fetchWithRetry(
//   url,
//   options,
//   retries = 5,
//   delay = 5000
// ): Promise<Response> {
//   for (let i = 0; i < retries; i++) {
//     try {
//       const res = await fetch(url, { ...options, agent });
//       if (res.status === 429 || res.status === 503) {
//         console.warn(
//           `⚠️ ${
//             res.status === 429 ? 'Rate limit' : 'Service Unavailable'
//           } hit. Retrying in ${delay}ms...`
//         );
//         await new Promise(r => setTimeout(r, delay));
//         delay *= 2; // exponential backoff
//         continue;
//       }
//       return res;
//     } catch (err) {
//       console.warn(
//         `⚠️ Network error: ${err.message}. Retrying in ${delay}ms...`
//       );
//       await new Promise(r => setTimeout(r, delay));
//       delay *= 2;
//     }
//   }
//   throw new Error('❌ Too many failed fetch attempts.');
// }


// /* ---------------------------------------------
//    🧠 Infer Category
// --------------------------------------------- */
// function inferCategory(title?) {
//   const t = title?.toLowerCase() || '';
//   if (t.includes('dress')) return 'Fashion > Dresses';
//   if (t.includes('shirt') || t.includes('t-shirt')) return 'Fashion > Tops';
//   if (t.includes('coat') || t.includes('jacket')) return 'Fashion > Outerwear';
//   if (t.includes('bag')) return 'Fashion > Bags';
//   if (t.includes('shoe') || t.includes('boot')) return 'Fashion > Footwear';
//   if (t.includes('ring') || t.includes('necklace') || t.includes('bracelet'))
//     return 'Jewellery';
//   return 'Uncategorised';
// }

// /* ---------------------------------------------
//    🚀 Main Runner Function
// --------------------------------------------- */
// async function startSync() {
//   const MONGO_URI =
//     process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';
//   await mongoose.connect(MONGO_URI);
//   console.log('✅ Connected to MongoDB');
//   console.log('📦 Starting charity product sync...');

//   for (const charity of FEATURED_CHARITIES) {
//     if (!charity.seller) continue;

//     console.log(`\n🔍 Fetching products for: ${charity.name}`);
//     const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?filter=sellers:{${charity.seller}}&limit=100`;

//     const res = await fetchWithRetry(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'X-EBAY-C-MARKETPLACE-ID': market,
//       },
//     });

//     if (!res.ok) {
//       console.warn(`⚠️ ${charity.name} returned HTTP ${res.status}`);
//       continue;
//     }

//     const data = await res.json();
//     const items = data.itemSummaries || [];
//     console.log(`📊 Found ${items.length} items for ${charity.name}`);

//     /* 🔄 Upsert charity info */
//     await Charity.findOneAndUpdate(
//       { seller: charity.seller },
//       {
//         $set: {
//           name: charity.name,
//           seller: charity.seller,
//           totalProducts: items.length,
//           lastUpdated: new Date(),
//         },
//       },
//       { upsert: true, new: true }
//     );

//     /* 🧹 Clear old products */
//     await CharityProduct.deleteMany({ charitySeller: charity.seller });

//     /* 💾 Save new products */
//     const formatted = items.map((p) => {
//       const category = p.categoryPath || inferCategory(p.title);
//       const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//       const cleanUrl = match
//         ? `https://www.ebay.co.uk/itm/${match[1]}`
//         : p.itemWebUrl;
//       const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${charity.seller}`;

//       return {
//         charitySeller: charity.seller,
//         title: p.title,
//         price: p.price?.value,
//         currency: p.price?.currency,
//         image: p.image?.imageUrl,
//         category,
//         condition: p.condition || 'Unknown',
//         brand: p.brand || 'Unknown',
//         affiliateUrl,
//       };
//     });

//     if (formatted.length > 0) {
//       await CharityProduct.insertMany(formatted);
//       console.log(`✅ Stored ${formatted.length} products for ${charity.name}`);
//     } else {
//       console.log(`ℹ️ No products found for ${charity.name}`);
//     }

// await new Promise(r => setTimeout(r, 15000));
//   }

//   console.log('\n🎉 Charity product sync complete!');
//   await mongoose.connection.close();
// }

// /* ---------------------------------------------
//    🏁 Run
// --------------------------------------------- */
// startSync().catch(err => {
//   console.error('❌ Script failed:', err);
//   mongoose.connection.close();
// });
// /**
//  * 🎯 Charity Product Fetcher for ALL Charities (Sequential & Incremental)
//  * - Fetches products for one charity at a time.
//  * - Updates DB incrementally (adds new, updates existing).
//  */

// import mongoose from "mongoose";
// import fetch, { Response } from "node-fetch";
// import dotenv from "dotenv";
// import https from "https";
// import Charity from "../models/CharityShop.model";
// import CharityProduct from "../models/CharityProduct.model";

// dotenv.config();

// const agent = new https.Agent({ keepAlive: true });
// const token = process.env.EBAY_OAUTH_TOKEN as string;
// const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";
// const campId = process.env.EPN_CAMPID || "123456";
// const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/angelpage";

// /* ---------------------------------------------
//    🏷️ Preselected Charities
// --------------------------------------------- */
// const PRE_SELECTED = [
//   { name: 'British Heart Foundation', seller: 'bhf_shops' },
//   { name: 'Oxfam', seller: 'oxfam_ebay_shop' },
//   { name: 'Cancer Research UK', seller: 'cancerresearchukshop' },
//   { name: 'British Red Cross', seller: 'britishredcross' },
//   { name: 'Children’s Society', seller: 'the_childrens_society' },
//   { name: 'Rampworx Youth Village 2000', seller: '' },
//   { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion' },
//   { name: 'Sense', seller: 'sensecharityretail' },
//   { name: 'PDSA', seller: 'pdsa_charity' },
//   { name: "Barnardo's", seller: 'barnardos_charity' },
//   { name: 'Age UK', seller: 'ageuk' },
//   { name: 'Sue Ryder', seller: 'sueryderpre-loved' },
//   { name: 'Marie Curie', seller: 'mariecurietrading' },
// ];

// /* ---------------------------------------------
//    🏷️ Featured Categories
// --------------------------------------------- */
// const FEATURED_CATEGORIES = [
//   "Jewellery & Watches",
//   "Cameras & Photography",
//   "Women",
//   "Men",
//   "Furniture",
// ];
// const LIMIT_PER_CATEGORY = 20;

// /* ---------------------------------------------
//    🔁 Retry with exponential backoff
// --------------------------------------------- */
// async function fetchWithRetry(
//   url,
//   options,
//   retries = 5,
//   delay = 5000
// ): Promise<Response> {
//   for (let i = 0; i < retries; i++) {
//     try {
//       const res = await fetch(url, { ...options, agent });
//       if (res.status === 429 || res.status === 503) {
//         console.warn(`⚠️ ${res.status} hit. Retrying in ${delay}ms...`);
//         await new Promise((r) => setTimeout(r, delay));
//         delay *= 2;
//         continue;
//       }
//       return res;
//     } catch (err) {
//       console.warn(`⚠️ Network error: ${err.message}. Retrying in ${delay}ms...`);
//       await new Promise((r) => setTimeout(r, delay));
//       delay *= 2;
//     }
//   }
//   throw new Error("❌ Too many failed fetch attempts.");
// }

// /* ---------------------------------------------
//    🧠 Category Inference
// --------------------------------------------- */
// function inferCategory(title?) {
//   const t = title?.toLowerCase() || "";
//   if (t.includes("watch") || t.includes("ring") || t.includes("necklace"))
//     return "Jewellery & Watches";
//   if (t.includes("camera") || t.includes("lens") || t.includes("photography"))
//     return "Cameras & Photography";
//   if (t.includes("dress") || t.includes("skirt") || t.includes("women"))
//     return "Women";
//   if (t.includes("men") || t.includes("shirt") || t.includes("jacket"))
//     return "Men";
//   if (t.includes("furniture") || t.includes("sofa") || t.includes("chair"))
//     return "Furniture";
//   return "Other";
// }

// /* ---------------------------------------------
//    🚀 Fetch products per category
// --------------------------------------------- */
// async function fetchCategoryProducts(
//   sellerId,
//   categoryKeyword
// ): Promise<any[]> {
//   const encodedQuery = encodeURIComponent(categoryKeyword);
//   const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodedQuery}&filter=sellerIds:{${sellerId}}&limit=${LIMIT_PER_CATEGORY}`;

//   console.log(`🔍 Fetching ${LIMIT_PER_CATEGORY} "${categoryKeyword}" items for ${sellerId}...`);

//   const res = await fetchWithRetry(url, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "X-EBAY-C-MARKETPLACE-ID": market,
//     },
//   });

//   if (!res.ok) {
//     const errText = await res.text();
//     console.error(`⚠️ eBay returned ${res.status} for "${categoryKeyword}" (${sellerId}): ${errText}`);
//     return [];
//   }

//   const data = await res.json();
//   const items = data.itemSummaries || [];

//   return items.map((p) => {
//     const cat = p.categoryPath || inferCategory(p.title);
//     const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//     const cleanUrl = match
//       ? `https://www.ebay.co.uk/itm/${match[1]}`
//       : p.itemWebUrl;
//     const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${sellerId}`;

//     return {
//       charitySeller: sellerId,
//       title: p.title,
//       price: p.price?.value,
//       currency: p.price?.currency,
//       image: p.image?.imageUrl,
//       category: cat,
//       condition: p.condition || "Unknown",
//       brand: p.brand || "Unknown",
//       affiliateUrl,
//       updatedAt: new Date(),
//     };
//   });
// }

// /* ---------------------------------------------
//    🧱 Fetch and Upsert for One Charity
// --------------------------------------------- */
// async function fetchCharityIncremental(sellerId) {
//   console.log(`\n🎯 Fetching balanced categories for seller: ${sellerId}`);

//   let allProducts[] = [];

//   for (const category of FEATURED_CATEGORIES) {
//     const products = await fetchCategoryProducts(sellerId, category);
//     allProducts.push(...products);
//     console.log(`✅ ${products.length} products fetched for ${category}`);
//     await new Promise((r) => setTimeout(r, 5000)); // wait 5s between categories
//   }

//   const uniqueProducts = Array.from(
//     new Map(allProducts.map((p) => [p.title, p])).values()
//   );

//   console.log(`📦 Total unique products collected for ${sellerId}: ${uniqueProducts.length}`);

//   await Charity.findOneAndUpdate(
//     { seller: sellerId },
//     {
//       $set: {
//         seller: sellerId,
//         userName: sellerId,
//         totalProducts: uniqueProducts.length,
//         lastUpdated: new Date(),
//       },
//     },
//     { upsert: true, new: true }
//   );

//   // 🔄 Incremental Upsert — update existing, insert new
//   for (const product of uniqueProducts) {
//     await CharityProduct.findOneAndUpdate(
//       { charitySeller: sellerId, title: product.title },
//       { $set: product },
//       { upsert: true, new: true }
//     );
//   }

//   console.log(`💾 Upserted ${uniqueProducts.length} products for ${sellerId}`);
// }

// /* ---------------------------------------------
//    🏁 Sequential Runner (One Charity at a Time)
// --------------------------------------------- */
// (async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log("✅ Connected to MongoDB");

//   for (const charity of PRE_SELECTED) {
//     if (!charity.seller) {
//       console.log(`⚠️ Skipping ${charity.name} (no seller ID).`);
//       continue;
//     }

//     try {
//       await fetchCharityIncremental(charity.seller);
//     } catch (err) {
//       console.error(`❌ Failed for ${charity.name}:`, err);
//     }

//     console.log(`⏳ Waiting 20 seconds before next charity...\n`);
//     await new Promise((r) => setTimeout(r, 20000)); // 20s delay between charities
//   }

//   console.log("🎉 All charities processed successfully!");
//   await mongoose.connection.close();
// })();
// import mongoose from 'mongoose';
// import fetch, { Response } from 'node-fetch';
// import dotenv from 'dotenv';
// import https from 'https';
// import Charity from '../models/CharityShop.model';
// import CharityProduct from '../models/CharityProduct.model';

// dotenv.config();

// const agent = new https.Agent({ keepAlive: true });
// const token = process.env.EBAY_OAUTH_TOKEN as string;
// const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
// const campId = process.env.EPN_CAMPID || '123456';
// const MONGO_URI =
//   process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';

// /* ---------------------------------------------
//    🏷️ Preselected Charities
// --------------------------------------------- */
// const PRE_SELECTED = [
//   { name: 'British Heart Foundation', seller: 'bhf_shops' },
//   { name: 'Oxfam', seller: 'oxfam_ebay_shop' },
//   { name: 'Cancer Research UK', seller: 'cancerresearchukshop' },
//   { name: 'British Red Cross', seller: 'britishredcross' },
//   { name: 'Children’s Society', seller: 'the_childrens_society' },
//   { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion' },
//   { name: 'Sense', seller: 'sensecharityretail' },
//   { name: 'PDSA', seller: 'pdsa_charity' },
//   { name: "Barnardo's", seller: 'barnardos_charity' },
//   { name: 'Age UK', seller: 'ageuk' },
//   { name: 'Sue Ryder', seller: 'sueryderpre-loved' },
//   { name: 'Marie Curie', seller: 'mariecurietrading' },
// ];

// /* ---------------------------------------------
//    🏷️ Expanded Category List
// --------------------------------------------- */
// const CATEGORY_KEYWORDS = [
//   // 👚 Clothing
//   "Women's Clothing",
//   "Men's Clothing",
//   "Kids' Clothing",
//   'Baby Clothing',
//   'Vintage Clothing',

//   // 👠 Shoes & Accessories
//   "Women's Shoes",
//   "Men's Shoes",
//   "Women's Accessories",
//   "Men's Accessories",
//   'Bags & Handbags',
//   'Jewellery & Watches',
//   'Watches',
//   'Necklaces',
//   'Earrings',
//   'Rings',
//   'Bracelets',
//   'Jewellery Sets',
//   'Brooches',
//   'Pendants',
//   'Jewellery Boxes',
//   'Hats & Fascinators',

//   // 🧥 Clothing Types
//   'Coats & Jackets',
//   'Trousers & Jeans',
//   'Shirts',
//   'Suits',
//   'T-Shirts & Tops',
//   'Sweatshirts & Hoodies',
//   'Knitwear',
//   'Shorts',
//   'Gilets & Bodywarmers',
//   'Dresses',
//   'Tops & Blouses',
//   'Skirts',
//   'Playsuits & Jumpsuits',
//   'Partywear',
//   'Nightwear & Lingerie',
//   'Swimwear',
//   'Blazers & Suit Jackets',
//   'Two Piece Suits',
//   'Three Piece Suits',
//   'Waistcoats',
//   'Occasion Dresses',
//   'Bridal',
//   'Mother of the Bride',
//   'Formalwear',

//   // 🏠 Home & Furniture
//   'Furniture',
//   'Home Décor',
//   'Lighting',
//   'Cookware & Dining',
//   'Utensils & Gadgets',
//   'Cutlery & Dining',
//   'Kitchen Supplies',
//   'Bathroom Accessories',
//   'Rugs & Carpets',
//   'Home Storage',
//   "Children's Furniture",
//   'Garden & Patio',
//   'Clocks',
//   'Appliances',
//   'Electricals',
//   'DIY Tools & Hardware',
//   'Fireplaces & Accessories',

//   // 🧸 Toys & Kids
//   'Toys & Games',
//   'Baby & Toddler',
//   'Clothing Bundles',
//   'Shoe Bundles',

//   // 🎮 Tech & Electronics
//   'Cameras & Photography',
//   'Cameras & Accessories',
//   'Lenses',
//   'Binoculars & Telescopes',
//   'Computers & Tablets',
//   'Mobile Phones',
//   'Video Games & Consoles',
//   'Sound & Vision',
//   'Smart Home & Electronics',

//   // 📚 Books & Media
//   'Books',
//   "Children's Books",
//   'Comic Books',
//   'Magazines',
//   'Film & TV',
//   'Music',

//   // 🖼️ Art & Collectables
//   'Art',
//   'Antiques',
//   'Collectables',
//   'Coins & Stamps',

//   // 💅 Lifestyle
//   'Health & Beauty',
//   'Sporting Goods',
//   'Sports & Leisure',
//   'PDSA Vet Care Products',

//   // 🎁 Gifts & Events
//   'Gifts',
//   'Cards & Invitations',
//   'Wedding Supplies',
//   'Christmas Ideas',

//   // ✏️ Stationery & Office
//   'Stationery',
//   'Crafts',
//   'Decoration',

//   // 🧳 Travel
//   'Luggage & Travel Accessories',

//   // 🛒 Misc
//   'Other',
// ];


// const LIMIT_PER_CATEGORY = 20;

// /* ---------------------------------------------
//    🔁 Retry with exponential backoff
// --------------------------------------------- */
// async function fetchWithRetry(
//   url,
//   options,
//   retries = 5,
//   delay = 5000
// ): Promise<Response> {
//   for (let i = 0; i < retries; i++) {
//     try {
//       const res = await fetch(url, { ...options, agent });
//       if (res.status === 429 || res.status === 503) {
//         console.warn(`⚠️ ${res.status} hit. Retrying in ${delay}ms...`);
//         await new Promise(r => setTimeout(r, delay));
//         delay *= 2;
//         continue;
//       }
//       return res;
//     } catch (err) {
//       console.warn(
//         `⚠️ Network error: ${err.message}. Retrying in ${delay}ms...`
//       );
//       await new Promise(r => setTimeout(r, delay));
//       delay *= 2;
//     }
//   }
//   throw new Error('❌ Too many failed fetch attempts.');
// }

// /* ---------------------------------------------
//    🧠 Category Inference
// --------------------------------------------- */
// function inferCategory(title?) {
//   const t = title?.toLowerCase() || '';

//   for (const keyword of CATEGORY_KEYWORDS) {
//     const clean = keyword.toLowerCase().replace(/&/g, 'and');
//     const words = clean.split(/\s|,|'/).filter(Boolean);
//     if (words.some(w => t.includes(w))) return keyword;
//   }
//   return 'Other';
// }

// /* ---------------------------------------------
//    🚀 Fetch products per category
// --------------------------------------------- */
// async function fetchCategoryProducts(
//   sellerId,
//   categoryKeyword
// ): Promise<any[]> {
//   const encodedQuery = encodeURIComponent(categoryKeyword);
//   const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodedQuery}&filter=sellerIds:{${sellerId}}&limit=${LIMIT_PER_CATEGORY}`;

//   console.log(
//     `🔍 Fetching ${LIMIT_PER_CATEGORY} "${categoryKeyword}" items for ${sellerId}...`
//   );

//   const res = await fetchWithRetry(url, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'X-EBAY-C-MARKETPLACE-ID': market,
//     },
//   });

//   if (!res.ok) {
//     const errText = await res.text();
//     console.error(
//       `⚠️ eBay returned ${res.status} for "${categoryKeyword}" (${sellerId}): ${errText}`
//     );
//     return [];
//   }

//   const data = await res.json();
//   const items = data.itemSummaries || [];

//   return items.map((p) => {
//     const cat = p.categoryPath || inferCategory(p.title);
//     const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//     const itemId = p.itemId || (match ? match[1] : p.title);
//     const cleanUrl = match
//       ? `https://www.ebay.co.uk/itm/${match[1]}`
//       : p.itemWebUrl;
//     const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${sellerId}`;

//     return {
//       itemId,
//       charitySeller: sellerId,
//       title: p.title,
//       price: p.price?.value,
//       currency: p.price?.currency,
//       image: p.image?.imageUrl,
//       category: cat,
//       condition: p.condition || 'Unknown',
//       brand: p.brand || 'Unknown',
//       affiliateUrl,
//       updatedAt: new Date(),
//     };
//   });
// }

// /* ---------------------------------------------
//    🧱 Fetch and Upsert for One Charity
// --------------------------------------------- */
// async function fetchCharityIncremental(sellerId) {
//   console.log(`\n🎯 Fetching balanced categories for seller: ${sellerId}`);

//   let allProducts[] = [];

//   for (const category of CATEGORY_KEYWORDS) {
//     const products = await fetchCategoryProducts(sellerId, category);
//     allProducts.push(...products);
//     console.log(`✅ ${products.length} products fetched for ${category}`);
//     await new Promise(r => setTimeout(r, 4000));
//   }

//   // ✅ Deduplicate by itemId
//   const uniqueProducts = Array.from(
//     new Map(allProducts.map(p => [p.itemId, p])).values()
//   );

//   console.log(
//     `📦 Total unique products collected for ${sellerId}: ${uniqueProducts.length}`
//   );

//   await Charity.findOneAndUpdate(
//     { seller: sellerId },
//     {
//       $set: {
//         seller: sellerId,
//         userName: sellerId,
//         totalProducts: uniqueProducts.length,
//         lastUpdated: new Date(),
//       },
//     },
//     { upsert: true, new: true }
//   );

//   for (const product of uniqueProducts) {
//     await CharityProduct.findOneAndUpdate(
//       { itemId: product.itemId },
//       { $set: product },
//       { upsert: true, new: true }
//     );
//   }

//   console.log(`💾 Upserted ${uniqueProducts.length} products for ${sellerId}`);
// }

// /* ---------------------------------------------
//    🏁 Sequential Runner
// --------------------------------------------- */
// (async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log('✅ Connected to MongoDB');

//   for (const charity of PRE_SELECTED) {
//     if (!charity.seller) {
//       console.log(`⚠️ Skipping ${charity.name} (no seller ID).`);
//       continue;
//     }

//     try {
//       await fetchCharityIncremental(charity.seller);
//     } catch (err) {
//       console.error(`❌ Failed for ${charity.name}:`, err);
//     }

//     console.log(`⏳ Waiting 15 seconds before next charity...\n`);
//     await new Promise(r => setTimeout(r, 15000));
//   }

//   console.log('🎉 All charities processed successfully!');
//   await mongoose.connection.close();
// })();

/* eslint-env node */
// import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import https from 'https';
import { bulkUpsertCharityProducts } from "../models/CharityProduct.supabase.js";
import { upsertCharityShop } from "../models/CharityShop.supabase.js";

dotenv.config();

const agent = new https.Agent({ keepAlive: true });
import { getValidToken, startAutoRefresh } from '../utils/ebayAuth.js'; // adjust path as needed

startAutoRefresh(); // automatically renew token in background

const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
const campId = process.env.EPN_CAMPID || '123456';
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';

const LIMIT_PER_CATEGORY = 100;

/* ---------------------------------------------
   🏷️ Preselected Charities
--------------------------------------------- */

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

/* ---------------------------------------------
   🧭 Category Groups for Faster Fetching
--------------------------------------------- */
const CATEGORY_FILTER_MAP = {
  /* -------------------- 🧥 Fashion -------------------- */
  Fashion: [
    "Men's Clothing",
    'Men',
    'kids',
    'Women',
    "Kids' Clothing",
    'Baby Clothing',
    "Women's Clothing",
    'Bags & Handbags',
    "Women's Bags & Handbags",
    "Women's Accessories",
    "Men's Accessories",
    "Women's Shoes",
    "Men's Shoes",
    "Clothing",
    "Shoes",
    "Baby & Toddler",
    "Clothing Bundles",
    "Shoe Bundles",
    "Women's Clothing",
    "Women's Footwear",
    "Women's Bags & Handbags",
    "Women's Accessories",
    "Men's Clothing",
    "Men's Footwear",
    "Men's Accessories & Bags",
    "Kid's Clothing",
    "Kid's Footwear",
    "Kid's Accessories",
    "Kid's Backpacks & Bags",
    "Baby & Toddler Clothing",
    "Baby Shoes",
    "Baby Accessories",
    "Homewares",
    "Jewellery & Watches",
    "Cameras & Photography",
    "Furniture",
    "Collectables",
    "Featured categories",
    "Women's Clothing",
    "Video Games & Consoles",
    "Mens Clothing",
    "Bags & Accessories",
    "Cameras & Accessories",
    "Featured categories",
    "Women's Clothing",
    "Men's Clothing",
    "Women's Footwear",
    "Books",
    "Vintage Clothing",
    "Vintage",
    "Clothing",
    "Health & Beauty",
    "Health",
    "Beauty",
    "Dolls & Bears",
    "Featured categories",
    "Fine Jewellery",
    "Antiques & Collectables",
    "Women's Clothing",
    "Model Railways & Trains",
    "Men's Clothing",
    "Sports Memorabilia",
    "Featured categories",
    "Bought In Goods",
    "Health, Beauty & Wellbeing",
    "Technology & Gaming",
    "Wedding, Parties & Events",
    "Clothing, Shoes & Accessories",
    "Books",
    "Clothing",
    "Ornaments",
    "Collectable",
    "Cameras and Optics",
    "Bags & Accessories",
    "Marie Curie Collection",
    "Clothes, Shoes & Accessories",
    "Ladies Shoes",
    "Collectable & Vintage",
    "Home & Leisure",
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
    ],

  /* -------------------- 📚 Books, Comics & Magazines -------------------- */
  Books: [
    'Books, Comics & Magazines',
    'Antiquarian & Collectable Books',
    'Audio Books',
    'Book Accessories',
    'Book, Comic & Magazine Collections & Lots',
    "Children's Books",
    'Comic Books',
    'Fiction Books',
    'Magazines',
    'Non-Fiction Books',
    'Textbooks, Educational & Reference Books',
  ],

  /* -------------------- 🎬 DVDs, Films & TV -------------------- */
  DVDs: ['DVDs, Films & TV'],

  /* -------------------- 🎩 Accessories -------------------- */
  Accessories: [
    'Other Accessories',
    'Scarves/Shawls',
    'Hats',
    'Belts & Braces',
    'Suit Accessories',
    'Ties, Bow Ties & Cravats',
    'Belts, Braces & Keychains',
    'Gloves',
  ],
  /* -------------------- 💍 Jewellery & Watches -------------------- */
  'Jewellery & Watches': [
    'Watches',
    'Necklaces',
    'Jewellery Bundles',
    'Earrings',
    'Rings',
    'Bracelets',
    'Brooches',
    'Jewellery Sets',
    'Pendants',
    'Jewellery Box',
  ],

  /* -------------------- 👜 Bags & Accessories -------------------- */
  'Bags & Accessories': [
    'Bags',
    'Bags & Bag Accessories',
    'Backpacks & Rucksacks',
    'Holdalls',
    'Luggage & Suitcases',
    'Purses & Wallets',
    'Backpack',
  ],

  /* -------------------- 🏡 Home, Furniture & DIY -------------------- */
  Home: [
    'Home, Furniture & DIY',
    'Antiques',
    'Art',
    'Bathroom Accessories & Fittings',
    'Cards & Invitations for Celebrations & Occasions',
    "Children's Furniture & Decor",
    'Clocks',
    'Cabinets, Countertops & Hardware',
    'DIY Tools & Workshop Equipment',
    'Fireplaces & Accessories',
    'Food & Drinks',
    'Furniture',
    'Garden & Patio',
    'Heating, Cooling & Air',
    'Home Bedding',
    'Home Cookware, Dining & Bar Supplies',
    'Home Décor Items',
    'Home Lighting',
    'Home Security',
    'Home Storage Solutions',
    'Household & Laundry Supplies',
    'Kitchen Plumbing & Fittings',
    'Luggage & Travel Accessories',
    'Rugs & Carpets',
    'Small Kitchen Appliances',
    'Smart Home & Surveillance Electronics',
    'Stationery Equipment',
    'Wedding Supplies',
    'Window Curtains, Blinds & Accessories',
  ],

  /* -------------------- ⚡ Electronics & Electricals -------------------- */
  Electronics: [
    'Electricals',
    'Computers & Gaming',
    'Computer Peripherals',
    'Computers & Laptops',
    'Games & Accessories',
    'Games Consoles',
    'PC Components',
    'DJ & Pro Audio Equipment',
    'Handheld Devices',
    'Home Audio & Visual Equipment',
    'Home Printers & Scanners',
    'Household Appliances & Items',
    'Lighting',
    'Office & Business Equipment',
    'Phones',
    'Power Tools',
    'Smart Home Electricals',
    'Tablets',
    'Vintage & Retro Electricals',
    'Gadgets',
    'Computing',
    'Mobile Phones & Tablets',
    'Mobile Phones',
    'Vintage & Retro Electricals',
  ],
  /* -------------------- 🏃‍♂️ Sportswear -------------------- */
  Sportswear: [
    'Sportswear',
    'Football Wear',
    'Motorcycle Wear',
    'Activewear',
    'Golf Wear',
    'Ski Wear',
    'Equestrian',
    'Rugby',
    'Other',
  ],
  Toys: ['Toys'],

  /* -------------------- 💅 Health & Beauty -------------------- */
  'Health & Beauty': [
    'Health & Beauty',
    'Beauty Electricals',
    'Cosmetics & Cosmetic Bags',
    'Hair Styling Tools',
    'Fragrance',
    'Bath/Hair/Lotions',
    'Wigs',
  ],

  /* -------------------- 🌿 Lifestyle & Misc -------------------- */
  Lifestyle: [
    'Musical Instruments',
    'Sporting Goods',
    'Arts & Crafts',
    'Business, Office & Stationery',
    'Non-Clothing',
    'Pets',
    'CRUK Shop Products',
    'Christmas Gifts',
    'Essential Range',
    'Christmas',
    'Other',
  ],

  /* -------------------- 🚗 eBay Motors -------------------- */
  Motors: ['Cars, Motorcycles & Vehicles', 'Parts & Accessories'],
};

/* ---------------------------------------------
   🧠 Category Inference (Fuzzy Matching)
--------------------------------------------- */
function inferCategory(title){
  if (!title) return 'Other';
  const t = title.toLowerCase();

  // 🎯 Step 1: Fuzzy keyword map
  const fuzzyMap = {
    // 👚 Women's Clothing
    dress: "Women's Clothing",
    blouse: "Women's Clothing",
    skirt: "Women's Clothing",
    top: "Women's Clothing",
    jumpsuit: "Women's Clothing",
    playsuit: "Women's Clothing",
    tunic: "Women's Clothing",
    gown: "Women's Clothing",
    lingerie: "Women's Clothing",
    nightwear: "Women's Clothing",
    swimsuit: "Women's Clothing",
    bikini: "Women's Clothing",
    maternity: "Women's Clothing",
    hoodie: 'Sweatshirts & Hoodies',
    sweatshirt: 'Sweatshirts & Hoodies',

    // 👕 Men's Clothing
    shirt: "Men's Clothing",
    trouser: "Men's Clothing",
    jeans: "Men's Clothing",
    jacket: "Men's Clothing",
    coat: "Men's Clothing",
    tshirt: "Men's Clothing",
    polo: "Men's Clothing",
    jumper: "Men's Clothing",
    waistcoat: "Men's Clothing",
    blazer: "Men's Clothing",
    suit: "Men's Clothing",
    short: "Men's Clothing",
    gilet: "Men's Clothing",

    // 👟 Shoes & Accessories
    shoe: "Women's Shoes",
    boot: "Women's Shoes",
    trainer: "Women's Shoes",
    heel: "Women's Shoes",
    sandal: "Women's Shoes",
    slipper: "Women's Shoes",
    handbag: 'Bags & Accessories',
    purse: 'Bags & Accessories',
    wallet: 'Bags & Accessories',
    rucksack: 'Bags & Accessories',
    backpack: 'Bags & Accessories',
    holdall: 'Bags & Accessories',
    suitcase: 'Bags & Accessories',
    luggage: 'Bags & Accessories',
    belt: "Men's Accessories",
    tie: "Men's Accessories",
    hat: "Other Accessories",
    scarf: "Other Accessories",
    glove: "Other Accessories",

    // 💍 Jewellery
    ring: 'Jewellery & Watches',
    necklace: 'Jewellery & Watches',
    bracelet: 'Jewellery & Watches',
    earring: 'Jewellery & Watches',
    brooch: 'Jewellery & Watches',
    pendant: 'Jewellery & Watches',
    watch: 'Jewellery & Watches',
    jewellery: 'Jewellery & Watches',

    // ⚽ Sportswear
    football: 'Sportswear',
    golf: 'Sportswear',
    ski: 'Sportswear',
    equestrian: 'Sportswear',
    rugby: 'Sportswear',
    activewear: 'Sportswear',
    tracksuit: 'Sportswear',
    jersey: 'Sportswear',
    kit: 'Sportswear',
    motorcycle: 'Sportswear',
    biker: 'Sportswear',

    // 💅 Health & Beauty
    perfume: 'Health & Beauty',
    fragrance: 'Health & Beauty',
    lotion: 'Health & Beauty',
    cream: 'Health & Beauty',
    shampoo: 'Health & Beauty',
    conditioner: 'Health & Beauty',
    soap: 'Health & Beauty',
    cosmetic: 'Health & Beauty',
    makeup: 'Health & Beauty',
    wig: 'Health & Beauty',
    hairdryer: 'Health & Beauty',
    straightener: 'Health & Beauty',
    curler: 'Health & Beauty',
    shaver: 'Health & Beauty',

    // 📚 Books & Media
    book: 'Books',
    comic: 'Comic Books',
    magazine: 'Magazines',
    novel: 'Books',
    story: 'Books',
    dvd: 'DVDs',
    blu: 'DVDs',
    film: 'DVDs',
    movie: 'DVDs',

    // 🧸 Toys
    toy: 'Toys',
    teddy: 'Toys',
    puzzle: 'Toys',
    gameboard: 'Toys',

    // ⚡ Electronics & Electricals
    computer: 'Electronics',
    laptop: 'Electronics',
    tablet: 'Electronics',
    pc: 'Electronics',
    phone: 'Electronics',
    iphone: 'Electronics',
    android: 'Electronics',
    console: 'Electronics',
    xbox: 'Electronics',
    playstation: 'Electronics',
    nintendo: 'Electronics',
    printer: 'Electronics',
    scanner: 'Electronics',
    monitor: 'Electronics',
    keyboard: 'Electronics',
    mouse: 'Electronics',
    tool: 'Electronics',
    appliance: 'Electronics',
    audio: 'Electronics',
    speaker: 'Electronics',
    headphone: 'Electronics',
    tv: 'Electronics',
    light: 'Electronics',
    lamp: 'Electronics',

    // 🏠 Home & Living
    sofa: 'Furniture',
    chair: 'Furniture',
    table: 'Furniture',
    cupboard: 'Furniture',
    drawer: 'Furniture',
    bed: 'Furniture',
    rug: 'Rugs & Carpets',
    carpet: 'Rugs & Carpets',
    cushion: 'Home & Furniture',
    curtain: 'Home & Furniture',
    mirror: 'Home & Furniture',
    bedding: 'Home & Furniture',
    vase: 'Home & Furniture',
    mug: 'Home & Furniture',
    plate: 'Home & Furniture',
    glass: 'Home & Furniture',
    fork: 'Home & Furniture',
    spoon: 'Home & Furniture',
    knife: 'Home & Furniture',

    // 🎁 Lifestyle & Misc
    craft: 'Arts & Crafts',
    art: 'Arts & Crafts',
    canvas: 'Arts & Crafts',
    paint: 'Arts & Crafts',
    brush: 'Arts & Crafts',
    stationery: 'Business, Office & Stationery',
    notebook: 'Business, Office & Stationery',
    folder: 'Business, Office & Stationery',
    christmas: 'CRUK Shop Products',
    gift: 'CRUK Shop Products',
    pet: 'Pets',
    dog: 'Pets',
    cat: 'Pets',
    leash: 'Pets',
    collar: 'Pets',
    beddings: 'Home & Furniture',
    vintage: 'Collectables',
    retro: 'Collectables',
    antique: 'Collectables',
    memorabilia: 'Collectables',
  };

  // 🔎 Match fuzzy keywords
  for (const [keyword, category] of Object.entries(fuzzyMap)) {
    if (t.includes(keyword)) return category;
  }

  // 🔎 Fallback: check by major category keyword
  const CATEGORY_KEYWORDS = Object.values(CATEGORY_FILTER_MAP).flat();
  for (const keyword of CATEGORY_KEYWORDS) {
    const clean = keyword.toLowerCase().replace(/&/g, 'and');
    if (t.includes(clean.split(' ')[0])) return keyword;
  }

  return 'Other';
}


/* ---------------------------------------------
   🔁 Safe Fetch with Retry
--------------------------------------------- */
async function fetchWithRetry(url, options, retries = 4, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, agent });
      if (res.status === 429 || res.status === 503) {
        console.warn(`⚠️ Rate-limited (${res.status}). Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`⚠️ Network error: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("❌ Too many fetch failures.");
}

/* ---------------------------------------------
   🚀 Fetch products per category
--------------------------------------------- */
async function fetchCategoryProducts(
  sellerId,
  charityId,
  categoryKeyword
) {
  const encodedQuery = encodeURIComponent(categoryKeyword);
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&q=${encodedQuery}&filter=sellers:{${sellerId}}&limit=${LIMIT_PER_CATEGORY}`;

  console.log(
    `🔍 Fetching ${LIMIT_PER_CATEGORY} "${categoryKeyword}" items for ${sellerId}...`
  );

const token = await getValidToken();
const res = await fetchWithRetry(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-EBAY-C-MARKETPLACE-ID': market,
  },
});


  if (!res.ok) {
    const errText = await res.text();
    console.error(
      `⚠️ eBay returned ${res.status} for "${categoryKeyword}" (${sellerId}): ${errText}`
    );
    return [];
  }

  const data = await res.json();
  const items = data.itemSummaries || [];

  return items.map((p) => {
    const cat = inferCategory(p.title);
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
      price: parseFloat(p.price?.value || 0),
      currency: p.price?.currency,
      image: p.image?.imageUrl,
      thumbnailImages: (p.thumbnailImages || []).map((t) => t.imageUrl),
      additionalImages: (p.additionalImages || []).map((a) => a.imageUrl),
      categories: p.categories || [],
      category:
        p.categories?.[p.categories.length - 1]?.categoryName || categoryKeyword || "Other",
      condition: p.condition || "Unknown",
      brand: p.brand || "Unknown",
      seller: p.seller || {},
      buyingOptions: p.buyingOptions || [],
      shippingOptions: p.shippingOptions || [],
      itemLocation: p.itemLocation || {},
      affiliateUrl,
      updatedAt: new Date(),
    };
  });
}

/* ---------------------------------------------
   🧱 Fetch + Upsert into Supabase
--------------------------------------------- */
async function fetchCharitySupabase(sellerId, charityId) {
  console.log(`\n🎯 Fetching products for seller: ${sellerId}`);
  let allProducts = [];

  for (const [groupName, subCategories] of Object.entries(CATEGORY_FILTER_MAP)) {
    console.log(`🗂️ Category group: ${groupName}`);
    for (const sub of subCategories) {
      const products = await fetchCategoryProducts(sellerId, charityId, sub);
      allProducts.push(...products);
      console.log(`✅ ${products.length} fetched for ${sub}`);
      await new Promise((r) => setTimeout(r, 3000)); // small delay
    }
  }

  const uniqueProducts = Array.from(new Map(allProducts.map((p) => [p.itemId, p])).values());
  console.log(`📦 Total unique: ${uniqueProducts.length}`);

  // 🏪 Upsert charity shop FIRST (avoid FK constraint)
  await upsertCharityShop({
    seller: sellerId,
    userName: sellerId,
    totalProducts: uniqueProducts.length,
  });

  // 💾 Then upsert products
  await bulkUpsertCharityProducts(uniqueProducts);

  console.log(`🎉 Saved ${uniqueProducts.length} products for ${sellerId}`);
}


/* ---------------------------------------------
   🏁 Sequential Runner
--------------------------------------------- */
(async () => {
  console.log("✅ Starting charity product fetch (Supabase mode)...");

  for (const charity of PRE_SELECTED) {
    if (!charity.seller || !charity.charity_ids) {
      console.log(`⚠️ Skipping ${charity.name} (missing seller/charity ID)`);
      continue;
    }

    try {
      await fetchCharitySupabase(charity.seller, charity.charity_ids);
    } catch (err) {
      console.error(`❌ Failed for ${charity.name}: ${err.message}`);
    }

    console.log(`⏳ Waiting 15s before next charity...\n`);
    await new Promise((r) => setTimeout(r, 15000));
  }

  console.log("🏁 Done fetching all charity products (Supabase).");
})();