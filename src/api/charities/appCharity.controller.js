// import fetch from "node-fetch";
// import https from "https";
// import dotenv from "dotenv";
// dotenv.config();

// /** 🔁 Keep-alive agent for stability */
// const agent = new https.Agent({ keepAlive: true });

// /** Retry-safe fetch helper (handles rate limits & network errors) */
// async function fetchWithRetry(url, options, retries = 3, delay = 1500) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const res = await fetch(url, { ...options, agent });
//             if (res.status === 429) {
//                 console.warn(`⚠️ Rate limit hit for ${url}. Retrying in ${delay}ms...`);
//                 await new Promise(r => setTimeout(r, delay));
//                 continue;
//             }
//             return res;
//         } catch (err) {
//             console.warn(`⚠️ Network error: ${err.message}`);
//             await new Promise(r => setTimeout(r, delay));
//         }
//     }
//     throw new Error("❌ Too many failed fetch attempts.");
// }

// /** Main Controller: Fetch all charities + enrich with product counts */
// export const getCharities = async (req, res) => {
//     const token = process.env.EBAY_OAUTH_TOKEN;
//     const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";

//     try {
//         console.log("📡 Fetching all charities (paginated from eBay)...");

//         let url = "https://api.ebay.com/commerce/charity/v1/charity_org?q=charity&limit=100";
//         const charities = [];

//         /** 1️⃣ Fetch all charity pages */
//         while (url) {
//             const r = await fetchWithRetry(url, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "X-EBAY-C-MARKETPLACE-ID": market,
//                 },
//             });

//             const data = await r.json();
//             charities.push(...(data.charityOrgs || []));
//             console.log(`📦 Loaded ${charities.length}/${data.total} charities so far...`);

//             url = data.next; // pagination
//             await new Promise(r => setTimeout(r, 800)); // small delay to avoid throttling
//         }

//         console.log(`✅ Total charities fetched: ${charities.length}`);

//         /** 2️⃣ Helper to enrich a single charity with product count */
//         const enrichCharity = async (c) => {
//             const seller = c.name?.toLowerCase().replace(/\s+/g, "");
//             const base = {
//                 id: c.charityOrgId,
//                 name: c.name,
//                 seller,
//                 website: c.website,
//                 mission: c.missionStatement,
//                 logo: c.logoImage?.imageUrl,
//                 city: c.location?.address?.city,
//                 state: c.location?.address?.stateOrProvince,
//                 postalCode: c.location?.address?.postalCode,
//             };

//             if (!seller) return { ...base, productCount: 0 };

//             try {
//                 const r = await fetchWithRetry(
//                     `https://api.ebay.com/buy/browse/v1/item_summary/search?q=charity&filter=sellers:{${seller}}&limit=1`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                             "X-EBAY-C-MARKETPLACE-ID": market,
//                         },
//                     }
//                 );

//                 const prod = await r.json();
//                 return { ...base, productCount: prod.total || 0 };
//             } catch (err) {
//                 console.warn(`⚠️ Failed product fetch for ${c.name}: ${err.message}`);
//                 return { ...base, productCount: 0 };
//             }
//         };

//         /** 3️⃣ Batch charities to avoid overload */
//         const BATCH_SIZE = 10;
//         const enriched = [];

//         for (let i = 0; i < charities.length; i += BATCH_SIZE) {
//             const batch = charities.slice(i, i + BATCH_SIZE);
//             console.log(`🧩 Processing batch ${i / BATCH_SIZE + 1} (${batch.length} charities)...`);
//             const results = await Promise.all(batch.map(enrichCharity));
//             enriched.push(...results);
//             await new Promise(r => setTimeout(r, 1000)); // avoid hitting eBay limits
//         }

//         /** 4️⃣ Filter charities with ≥100 products */
//         const filtered = enriched
//             .filter(c => c.productCount >= 100)
//             .sort((a, b) => b.productCount - a.productCount);

//         console.log(`✅ Final filtered charities: ${filtered.length}`);

//         /** 5️⃣ Respond with data */
//         res.json({
//             totalAvailable: charities.length,
//             totalFiltered: filtered.length,
//             charities: filtered,
//         });

//     } catch (err) {
//         console.error("❌ Charity API error:", err);
//         res.status(500).json({ error: "Failed to fetch charities" });
//     }
// };

// this is showing lists of all charities===================================
/* eslint-env node */
import fetch from "node-fetch";
import https from "https";
import dotenv from "dotenv";
dotenv.config();

/** 🔁 Keep-alive agent for better connection reuse */
const agent = new https.Agent({ keepAlive: true });

/** 🔁 Retry-safe fetch with rate-limit handling */
async function fetchWithRetry(url, options, retries = 3, delay = 1500) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { ...options, agent });
            if (res.status === 429) {
                console.warn(`⚠️ Rate limit hit for ${url}. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            return res;
        } catch (err) {
            console.warn(`⚠️ Network error: ${err.message}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("❌ Too many failed fetch attempts.");
}

/** 🎯 Main Controller: Fetch all charities (no processing, full pagination) */
export const getCharities = async (req, res) => {
    const token = process.env.EBAY_OAUTH_TOKEN;
    const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";

    try {
        console.log("📡 Fetching all charities (full list from eBay)...");

        let url = "https://api.ebay.com/commerce/charity/v1/charity_org?q=charity&limit=100";
        const charities = [];
        let page = 0;

        /** 🔁 Fetch every page until no `next` link remains */
        while (url) {
            page++;
            console.log(`➡️ Fetching page ${page} from: ${url}`);

            const response = await fetchWithRetry(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-EBAY-C-MARKETPLACE-ID": market,
                },
            });

            if (!response.ok) {
                console.error(`⚠️ eBay responded with ${response.status}.`);
                break;
            }

            const data = await response.json();
            const list = data.charityOrgs || [];
            charities.push(...list);

            console.log(`📦 Loaded ${charities.length}/${data.total || "?"} charities so far...`);

            // Move to next page
            url = data.next;
            await new Promise(r => setTimeout(r, 1000)); // gentle delay for eBay API
        }

        console.log(`✅ Finished. Total charities fetched: ${charities.length}`);

        /** ✅ Return all charities as-is */
        res.json({
            total: charities.length,
            charities,
        });

    } catch (err) {
        console.error("❌ Charity API error:", err);
        res.status(500).json({ error: "Failed to fetch full charity list" });
    }
};
// import fetch from "node-fetch";
// import https from "https";
// import dotenv from "dotenv";
// dotenv.config();

// const agent = new https.Agent({ keepAlive: true });

// /** 🎯 Featured UK charities with verified eBay seller handles */
// const FEATURED_CHARITIES = [
//     { name: "British Heart Foundation", seller: "bhf_shops" },
//     { name: "Cancer Research UK", seller: "cancerresearchukshop" },
//     { name: "Children’s Society", seller: "the_childrens_society" },
//     { name: "Rampworx Youth Village 2000", seller: "" },
//     { name: "Royal British Legion Industries", seller: "theroyalbritishlegion" },
//     { name: "sanse", seller: "sensecharityretail" },
//     { name: "Oxfam", seller: "oxfam_ebay_shop" },
//     { name: "PDSA", seller: "pdsa_charity" },
//     { name: "Barnardo's", seller: "barnardos_charity" },
//     { name: "British Red Cross", seller: "britishredcross" },
//     { name: "Age UK", seller: "ageuk" },
//     { name: "Sue Ryder", seller: "sueryderpre-loved" },
//     { name: "Marie Curie", seller: "mariecurietrading" },
// ];

// /** 🔁 Retry-safe fetch helper */
// async function fetchWithRetry(url, options, retries = 5, delay = 20000)
//  {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const res = await fetch(url, { ...options, agent });
//             if (res.status === 429) {
//                 console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms...`);
//                 await new Promise(r => setTimeout(r, delay));
//                 continue;
//             }
//             return res;
//         } catch (err) {
//             console.warn(`⚠️ Network error: ${err.message}`);
//             await new Promise(r => setTimeout(r, delay));
//         }
//     }
//     throw new Error("❌ Too many failed fetch attempts.");
// }

// /** 🧠 Infer category from title if eBay data missing */
// function inferCategory(title) {
//     const t = title?.toLowerCase() || "";
//     if (t.includes("dress")) return "Clothing > Dresses";
//     if (t.includes("shirt") || t.includes("t-shirt")) return "Clothing > Tops";
//     if (t.includes("coat") || t.includes("jacket")) return "Clothing > Outerwear";
//     if (t.includes("bag")) return "Accessories > Bags";
//     if (t.includes("shoe") || t.includes("boot")) return "Footwear";
//     if (t.includes("ring") || t.includes("necklace") || t.includes("bracelet"))
//         return "Jewellery";
//     return "Uncategorised";
// }

// /** 🎯 Fetch only top 10 products per featured charity */
// export const getCharities = async (req, res) => {
//     const token = process.env.EBAY_OAUTH_TOKEN;
//     const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";

//     try {
//         console.log("📡 Fetching up to 10 products per featured charity...");
//         const results = [];

//         for (const c of FEATURED_CHARITIES) {
//             if (!c.seller) continue;

//             console.log(`🔍 Fetching 10 products for: ${c.name}`);

//             const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?filter=sellers:{${c.seller}}&limit=10`;
//             const r = await fetchWithRetry(url, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "X-EBAY-C-MARKETPLACE-ID": market,
//                 },
//             });

//             if (!r.ok) {
//                 console.warn(`⚠️ eBay responded ${r.status} for ${c.name}`);
//                 continue;
//             }

//             const data = await r.json();
//             const items = data.itemSummaries || [];

//             const formattedItems = items.map(item => ({
//                 title: item.title,
//                 price: item.price?.value,
//                 currency: item.price?.currency,
//                 image: item.image?.imageUrl,
//                 category: item.categoryPath || inferCategory(item.title),
//                 url: item.itemWebUrl,
//                 condition: item.condition || "Unknown",
//             }));

//             results.push({
//                 name: c.name,
//                 seller: c.seller,
//                 totalFetched: formattedItems.length,
//                 sampleProducts: formattedItems,
//             });

//             console.log(`✅ ${c.name}: ${formattedItems.length} products fetched.`);
//             await new Promise(r => setTimeout(r, 60000)); // 60 sec pause
//         }

//         res.json({
//             totalCharities: results.length,
//             charities: results,
//         });
//     } catch (err) {
//         console.error("❌ Featured Charities API error:", err);
//         res.status(500).json({ error: "Failed to fetch featured charity data" });
//     }
// };
