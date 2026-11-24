"use strict";
/* eslint-env node */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import mongoose from 'mongoose';
// import fetch from 'node-fetch';
// import dotenv from 'dotenv';
// import https from 'https';
// import CharityProduct from '../models/CharityProduct.model.js';
// import Charity from '../models/CharityShop.model.js';
// import { getValidToken, startAutoRefresh } from '../utils/ebayAuth.js'; // adjust path as needed
// startAutoRefresh(); // automatically renew token in background
// dotenv.config();
// const agent = new https.Agent({ keepAlive: true });
// // const token = process.env.EBAY_OAUTH_TOKEN as string;
// const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
// const campId = process.env.EPN_CAMPID || '123456';
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/angelpage';
// const PRE_SELECTED = [
//   {
//     name: 'British Heart Foundation',
//     seller: 'bhf_shops',
//     charity_ids: '225971',
//   },
//   { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918' },
//   {
//     name: 'Cancer Research UK',
//     seller: 'cancerresearchukshop',
//     charity_ids: '1089464',
//   },
//   {
//     name: 'British Red Cross',
//     seller: 'britishredcross',
//     charity_ids: '220949',
//   },
//   {
//     name: 'Children’s Society',
//     seller: 'the_childrens_society',
//     charity_ids: '221124',
//   },
//   {
//     name: 'Royal British Legion Industries',
//     seller: 'theroyalbritishlegion',
//     charity_ids: '210063',
//   },
//   { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868' },
//   { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217' },
//   { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250' },
//   { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267' },
//   { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076' },
//   { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994' },
// ];
// // simple helper to retry network calls
// async function fetchWithRetry(
//   url,
//   options,
//   retries = 3,
//   delay = 3000
// ) {
//   for (let i = 0; i < retries; i++) {
//     const res = await fetch(url, { ...options, agent });
//     if (res.status === 429 || res.status === 503) {
//       console.warn(`⚠️ ${res.status} from eBay, retrying in ${delay}ms...`);
//       await new Promise(r => setTimeout(r, delay));
//       delay *= 2;
//       continue;
//     }
//     return res;
//   }
//   throw new Error('❌ Too many failed eBay requests.');
// }
// // fetch latest products (up to maxLimit, default 500)
// async function fetchLatestCharityProducts(charityId, sellerId, maxLimit = 500) {
//   console.log(`🔍 Fetching up to ${maxLimit} latest for ${sellerId}...`);
//   const token = await getValidToken();
//   const pageSize = 200; // eBay max per request
//   const allItems = [];
//   for (let offset = 0; offset < maxLimit; offset += pageSize) {
//     const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&filter=sellers:{${sellerId}}&sort=newlyListed&limit=${pageSize}&offset=${offset}`;
//     const res = await fetchWithRetry(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'X-EBAY-C-MARKETPLACE-ID': market,
//       },
//     });
//     if (!res.ok) {
//       const errText = await res.text();
//       console.error(`⚠️ eBay returned ${res.status} for ${sellerId}: ${errText}`);
//       break; // stop trying if one page fails
//     }
//     const data = await res.json();
//     const items = data.itemSummaries || [];
//     if (!items.length) {
//       console.log(`ℹ️ No more items found for ${sellerId} (stopped at ${offset})`);
//       break;
//     }
//     allItems.push(...items);
//     console.log(`📦 Retrieved ${allItems.length} so far...`);
//     // short delay between pages to be kind to eBay
//     await new Promise(r => setTimeout(r, 2000));
//     if (allItems.length >= maxLimit) break;
//   }
//   console.log(`✅ Fetched ${allItems.length} latest items for ${sellerId}`);
//   return allItems.map((p) => {
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
//       thumbnailImages: p.thumbnailImages?.map(t => t.imageUrl) || [],
//       additionalImages: p.additionalImages?.map(a => a.imageUrl) || [],
//       categories: p.categories || [],
//       category:
//         p.categories?.[p.categories.length - 1]?.categoryName || 'Other',
//       condition: p.condition || 'Unknown',
//       brand: p.brand || 'Unknown',
//       seller: p.seller || {},
//       buyingOptions: p.buyingOptions || [],
//       shippingOptions: p.shippingOptions || [],
//       itemLocation: p.itemLocation || {},
//       affiliateUrl,
//       updatedAt: new Date(),
//     };
//   });
// }
// // save and dedupe products
// async function saveUniqueProducts(products) {
//   let count = 0;
//   for (const product of products) {
//     await CharityProduct.findOneAndUpdate(
//       { itemId: product.itemId },
//       { $set: product },
//       { upsert: true, new: true }
//     );
//     count++;
//   }
//   console.log(`💾 Upserted ${count} products`);
// }
// // main runner
// (async () => {
//   await mongoose.connect(MONGO_URI);
//   console.log('✅ Connected to MongoDB');
//   for (const charity of PRE_SELECTED) {
//     console.log(`\n🎯 Processing ${charity.name}`);
// try {
//   const products = await fetchLatestCharityProducts(
//     charity.charity_ids,
//     charity.seller
//   );
//   console.log(`✅ Fetched ${products.length} latest items for ${charity.name}`);
//   // ✅ Deduplicate by itemId
//   const uniqueProducts = Array.from(
//     new Map(products.map((p) => [p.itemId, p])).values()
//   );
//   await saveUniqueProducts(uniqueProducts);
//   // ✅ Update charity info
//   await Charity.findOneAndUpdate(
//     { seller: charity.seller },
//     {
//       $set: {
//         seller: charity.seller,
//         userName: charity.seller,
//         totalProducts: uniqueProducts.length,
//         lastUpdated: new Date(),
//       },
//     },
//     { upsert: true, new: true }
//   );
//   console.log(
//     `🎉 Saved ${uniqueProducts.length} latest unique products for ${charity.name}`
//   );
// } catch (err) {
//   console.error(`❌ Failed for ${charity.name}: ${err.message}`);
// }
//     console.log(`⏳ Waiting 10s before next charity...\n`);
//     await new Promise(r => setTimeout(r, 10000));
//   }
//   await mongoose.connection.close();
//   console.log('🏁 Done fetching all latest charity products.');
// })();
/* eslint-env node */
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
const https_1 = __importDefault(require("https"));
const CharityProduct_supabase_js_1 = require("../models/CharityProduct.supabase.js");
const CharityShop_supabase_js_1 = require("../models/CharityShop.supabase.js");
const ebayAuth_js_1 = require("../utils/ebayAuth.js");
dotenv_1.default.config();
(0, ebayAuth_js_1.startAutoRefresh)(); // auto refresh token every ~2 hours
const agent = new https_1.default.Agent({ keepAlive: true });
const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
const campId = process.env.EPN_CAMPID || '123456';
// 🧩 Preselected charities
const PRE_SELECTED = [
    { name: 'British Heart Foundation', seller: 'bhf_shops', charity_ids: '225971' },
    { name: 'Oxfam', seller: 'oxfam_ebay_shop', charity_ids: '202918' },
    { name: 'Cancer Research UK', seller: 'cancerresearchukshop', charity_ids: '1089464' },
    { name: 'British Red Cross', seller: 'britishredcross', charity_ids: '220949' },
    { name: 'Children’s Society', seller: 'the_childrens_society', charity_ids: '221124' },
    { name: 'Royal British Legion Industries', seller: 'theroyalbritishlegion', charity_ids: '210063' },
    { name: 'Sense', seller: 'sensecharityretail', charity_ids: '289868' },
    { name: 'PDSA', seller: 'pdsa_charity', charity_ids: '208217' },
    { name: "Barnardo's", seller: 'barnardos_charity', charity_ids: '216250' },
    { name: 'Age UK', seller: 'ageuk', charity_ids: '1128267' },
    { name: 'Sue Ryder', seller: 'sueryderpre-loved', charity_ids: '1052076' },
    { name: 'Marie Curie', seller: 'mariecurietrading', charity_ids: '207994' },
];
/* ---------------------------------------------
   🕸️ Fetch wrapper with retries
--------------------------------------------- */
function fetchWithRetry(url_1, options_1) {
    return __awaiter(this, arguments, void 0, function* (url, options, retries = 3, delay = 3000) {
        for (let i = 0; i < retries; i++) {
            const res = yield (0, node_fetch_1.default)(url, Object.assign(Object.assign({}, options), { agent }));
            if (res.status === 429 || res.status === 503) {
                console.warn(`⚠️ ${res.status} from eBay, retrying in ${delay}ms...`);
                yield new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }
            return res;
        }
        throw new Error('❌ Too many failed eBay requests.');
    });
}
/* ---------------------------------------------
   🎯 Fetch latest products per charity
--------------------------------------------- */
/* ---------------------------------------------
   🎯 Fetch latest products per charity (1000 total, 200 per batch)
--------------------------------------------- */
function fetchLatestCharityProducts(charityId_1, sellerId_1) {
    return __awaiter(this, arguments, void 0, function* (charityId, sellerId, maxLimit = 1000) {
        console.log(`🔍 Fetching up to ${maxLimit} latest products for ${sellerId}...`);
        const token = yield (0, ebayAuth_js_1.getValidToken)();
        const pageSize = 200; // eBay API max page size
        const allItems = [];
        for (let offset = 0; offset < maxLimit; offset += pageSize) {
            const remaining = maxLimit - allItems.length;
            const limit = remaining < pageSize ? remaining : pageSize;
            const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&filter=sellers:{${sellerId}}&sort=newlyListed&limit=${limit}&offset=${offset}`;
            console.log(`📡 Requesting batch: offset=${offset}, limit=${limit}`);
            const res = yield fetchWithRetry(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'X-EBAY-C-MARKETPLACE-ID': market,
                },
                agent,
            });
            if (!res.ok) {
                const errText = yield res.text();
                console.error(`⚠️ eBay returned ${res.status} for ${sellerId}: ${errText}`);
                break;
            }
            const data = yield res.json();
            const items = data.itemSummaries || [];
            if (items.length === 0) {
                console.log(`ℹ️ No more items found for ${sellerId} (stopped at offset ${offset})`);
                break;
            }
            allItems.push(...items);
            console.log(`📦 Retrieved ${allItems.length}/${maxLimit} total so far...`);
            // polite delay between eBay API calls
            yield new Promise(r => setTimeout(r, 2000));
            // 🛑 Stop early if reached the target limit
            if (allItems.length >= maxLimit)
                break;
        }
        console.log(`✅ Finished: ${allItems.length} total fetched for ${sellerId}`);
        // 🧩 Clean + normalize products
        const mapped = allItems.map((p) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const match = (_a = p.itemWebUrl) === null || _a === void 0 ? void 0 : _a.match(/\/itm\/(\d+)/);
            const itemId = p.itemId || (match ? match[1] : p.title);
            const cleanUrl = match ? `https://www.ebay.co.uk/itm/${match[1]}` : p.itemWebUrl;
            const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${sellerId}`;
            return {
                itemId,
                charitySeller: sellerId,
                title: p.title,
                price: ((_b = p.price) === null || _b === void 0 ? void 0 : _b.value) || null,
                currency: ((_c = p.price) === null || _c === void 0 ? void 0 : _c.currency) || 'GBP',
                image: ((_d = p.image) === null || _d === void 0 ? void 0 : _d.imageUrl) || null,
                thumbnailImages: ((_e = p.thumbnailImages) === null || _e === void 0 ? void 0 : _e.map(t => t.imageUrl)) || [],
                additionalImages: ((_f = p.additionalImages) === null || _f === void 0 ? void 0 : _f.map(a => a.imageUrl)) || [],
                categories: p.categories || [],
                category: ((_h = (_g = p.categories) === null || _g === void 0 ? void 0 : _g[p.categories.length - 1]) === null || _h === void 0 ? void 0 : _h.categoryName) || 'Other',
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
        return mapped;
    });
}
/* ---------------------------------------------
   🚀 Main Runner
--------------------------------------------- */
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('✅ Starting charity product fetch (Supabase mode)...');
    for (const charity of PRE_SELECTED) {
        console.log(`\n🎯 Processing ${charity.name}`);
        try {
            const products = yield fetchLatestCharityProducts(charity.charity_ids, charity.seller, 1000);
            console.log(`✅ Fetched ${products.length} latest items for ${charity.name}`);
            const uniqueProducts = Array.from(new Map(products.map(p => [p.itemId, p])).values());
            // Save or update charity shop FIRST
            yield (0, CharityShop_supabase_js_1.upsertCharityShop)({
                seller: charity.seller,
                userName: charity.seller,
                totalProducts: uniqueProducts.length,
            });
            // Then bulk upsert its products
            yield (0, CharityProduct_supabase_js_1.bulkUpsertCharityProducts)(uniqueProducts);
            console.log(`🎉 Saved ${uniqueProducts.length} latest unique products for ${charity.name}`);
        }
        catch (err) {
            console.error(`❌ Failed for ${charity.name}: ${err.message}`);
        }
        console.log(`⏳ Waiting 10s before next charity...\n`);
        yield new Promise(r => setTimeout(r, 10000));
    }
    console.log('🏁 Done fetching all latest charity products (Supabase).');
}))();
