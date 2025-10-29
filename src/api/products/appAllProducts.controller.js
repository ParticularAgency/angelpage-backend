// import fetch from "node-fetch";
// import dotenv from "dotenv";
// dotenv.config();

// /** 🔁 Helper — retry fetch for rate-limited eBay requests */
// async function fetchWithRetry(url, options, retries = 3, delay = 1500) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const res = await fetch(url, options);
//             if (res.status === 429) {
//                 console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms...`);
//                 await new Promise((r) => setTimeout(r, delay));
//                 continue;
//             }
//             return res;
//         } catch (err) {
//             console.warn(`⚠️ Network error on attempt ${i + 1}:`, err.message);
//             await new Promise((r) => setTimeout(r, delay));
//         }
//     }
//     throw new Error("Too many failed fetch attempts.");
// }

// /** 🧩 Helper — safely parse JSON with retries */
// async function safeJson(res, retries = 2) {
//     for (let i = 0; i <= retries; i++) {
//         try {
//             return await res.json();
//         } catch (err) {
//             if (i === retries) throw new Error("Invalid JSON after retries.");
//             console.warn("⚠️ Retrying JSON parse after failure...");
//             await new Promise((r) => setTimeout(r, 1000));
//         }
//     }
// }

// /** 🧩 Helper — build eBay filter query string */
// function buildEbayFilterString(filters = {}) {
//     const filterParts = [];
//     if (filters.seller) filterParts.push(`sellers:{${filters.seller}}`);
//     if (filters.brand) filterParts.push(`brands:{${filters.brand}}`);
//     if (filters.condition) filterParts.push(`conditions:{${filters.condition}}`);
//     if (filters.category) filterParts.push(`categoryIds:{${filters.category}}`);
//     return filterParts.length ? `&filter=${filterParts.join(",")}` : "";
// }

// /** 🎯 Controller — Fetch all charity products with pagination & filters */
// export const getAllCharityProducts = async (req, res) => {
//     const token = process.env.EBAY_OAUTH_TOKEN;
//     const campId = process.env.EPN_CAMPID;
//     const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";
//     const baseUrl = process.env.BASE_URL || "http://localhost:5000";

//     const { brand, condition, category } = req.query;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     if (!baseUrl.startsWith("http")) {
//         console.error("❌ Invalid BASE_URL! Must start with http:// or https://");
//         return res
//             .status(500)
//             .json({ error: "Invalid BASE_URL. Please fix in .env file." });
//     }

//     try {
//         /** 1️⃣ Get charity sellers */
//         let sellers = [];
//         try {
//             const charityRes = await fetch(`${baseUrl}/api/charity/charity-lists`);
//             const charityData = await charityRes.json();
//             const charities = charityData.charities || charityData || [];

//             sellers = charities
//                 .map((c) => c.seller || c.name?.toLowerCase().replace(/\s+/g, ""))
//                 .filter(Boolean);
//         } catch (err) {
//             console.warn("⚠️ Charity API failed. Using fallback sellers list.");
//         }

//         /** 🩹 fallback seller list */
//         if (sellers.length === 0) {
//             sellers = [
//                 "bhfshop",
//                 "cancerresearchukshop",
//                 "oxfamgb",
//                 "barnardoscharityshop",
//                 "rspcaofficial",
//                 "edenvalleyhospice",
//             ];
//         }

//         const limitedSellers = sellers.slice(0, 5);
//         console.log(`✅ Found ${limitedSellers.length} charity sellers.`);

//         /** 2️⃣ Prepare filter string */
//         const filterString = buildEbayFilterString({ brand, condition, category });
//         const allProducts = [];

//         /** 3️⃣ Fetch products from eBay for each charity seller */
//         for (const seller of limitedSellers) {
//             console.log(`🔍 Fetching listings for seller: ${seller}`);
//             let url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=charity&filter=sellers:{${seller}}${filterString}&limit=50`;
//             let hasMore = true;

//             while (hasMore) {
//                 console.log("➡️ Fetching:", url);

//                 let r;
//                 try {
//                     r = await fetchWithRetry(url, {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                             "X-EBAY-C-MARKETPLACE-ID": market,
//                         },
//                     });
//                 } catch (fetchErr) {
//                     console.warn(`⚠️ Fetch failed for ${seller}:`, fetchErr.message);
//                     break;
//                 }

//                 if (!r.ok) {
//                     console.warn(`⚠️ HTTP ${r.status} for ${seller}`);
//                     break;
//                 }

//                 let data;
//                 try {
//                     data = await safeJson(r);
//                 } catch (parseErr) {
//                     console.warn(`⚠️ JSON parse failed for ${seller}:`, parseErr.message);
//                     break;
//                 }

//                 const items = data?.itemSummaries || [];
//                 if (items.length === 0) break;

//                 for (const p of items) {
//                     const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//                     const cleanUrl = match
//                         ? `https://www.ebay.co.uk/itm/${match[1]}`
//                         : p.itemWebUrl;
//                     const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${seller}`;

//                     allProducts.push({
//                         title: p.title,
//                         price: p.price?.value,
//                         currency: p.price?.currency,
//                         image: p.image?.imageUrl,
//                         url: affiliateUrl,
//                         seller,
//                         brand: p.brand || "Unknown",
//                         category:
//                             p.categoryPath?.split(">").map((s) => s.trim()) || [
//                                 "Uncategorised",
//                             ],
//                         condition: p.condition || "Unknown",
//                         size: p.itemGroup?.itemGroupTitle || "N/A",
//                         location: p.itemLocation?.country,
//                     });
//                 }

//                 // Use eBay’s built-in pagination (safer than manual offset)
//                 if (data.next) {
//                     url = data.next;
//                     await new Promise((r) => setTimeout(r, 1200)); // avoid rate-limit
//                 } else {
//                     hasMore = false;
//                 }
//             }
//         }

//         /** 4️⃣ Build filters */
//         const filterSets = {
//             brands: [...new Set(allProducts.map((p) => p.brand).filter(Boolean))],
//             conditions: [...new Set(allProducts.map((p) => p.condition).filter(Boolean))],
//             categories: [
//                 ...new Set(
//                     allProducts
//                         .flatMap((p) => p.category)
//                         .filter(Boolean)
//                         .map((c) => c.trim())
//                 ),
//             ],
//             sizes: [
//                 ...new Set(
//                     allProducts.map((p) => p.size).filter((s) => s && s !== "N/A")
//                 ),
//             ],
//         };

//         /** 5️⃣ Paginate results */
//         const totalProducts = allProducts.length;
//         const totalPages = Math.ceil(totalProducts / limit);
//         const start = (page - 1) * limit;
//         const end = start + limit;
//         const paginatedProducts = allProducts.slice(start, end);

//         /** 6️⃣ Send JSON response */
//         res.json({
//             totalProducts,
//             totalPages,
//             currentPage: page,
//             limit,
//             products: paginatedProducts,
//             filters: filterSets,
//         });
//     } catch (err) {
//         console.error("❌ Charity Products API error:", err);
//         res.status(500).json({ error: "Failed to fetch charity products" });
//     }
// };
// import fetch from "node-fetch";
// import dotenv from "dotenv";
// dotenv.config();

// /** Utility: Wait for delay (used to avoid rate-limit) */
// const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// /** Utility: fetch with retry on 429 */
// async function fetchWithRetry(url, options, retries = 3, delay = 1500) {
//     for (let i = 0; i < retries; i++) {
//         const response = await fetch(url, options);
//         if (response.status !== 429) return response;
//         console.warn(`⚠️ Rate limit hit, retrying in ${delay}ms...`);
//         await wait(delay);
//     }
//     throw new Error("Rate limit exceeded after retries.");
// }

// /** Controller: Fetch charity products for 6 specific charities */
// export const getAllCharityProducts = async (req, res) => {
//     const token = process.env.EBAY_OAUTH_TOKEN;
//     const campId = process.env.EPN_CAMPID || "5339129195";
//     const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";

//     // pagination params
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const sellers = [
//         "bhfshop",
//         "cancerresearchukshop",
//         "oxfamgb",
//         "barnardoscharityshop",
//         "rspcaofficial",
//         "edenvalleyhospice",
//     ];

//     try {
//         const allProducts = [];
//         console.log(`✅ Fetching products for ${sellers.length} charity sellers`);

//         // fetch each seller’s products
//         for (const seller of sellers) {
//             console.log(`🔍 Fetching from seller: ${seller}`);

//             const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=charity&filter=sellers:{${seller}}&limit=50`;

//             const resEbay = await fetchWithRetry(url, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "X-EBAY-C-MARKETPLACE-ID": market,
//                 },
//             });

//             const data = await resEbay.json();
//             const items = data.itemSummaries || [];

//             items.forEach((p) => {
//                 const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//                 const cleanUrl = match
//                     ? `https://www.ebay.co.uk/itm/${match[1]}`
//                     : p.itemWebUrl;
//                 const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${seller}`;

//                 allProducts.push({
//                     title: p.title,
//                     price: p.price?.value,
//                     currency: p.price?.currency,
//                     image: p.image?.imageUrl,
//                     url: affiliateUrl,
//                     seller,
//                     brand: p.brand || "Unknown",
//                     category: p.categoryPath?.split(">").map((s) => s.trim()) || [],
//                     condition: p.condition || "Unknown",
//                 });
//             });

//             await wait(1200); // avoid eBay rate-limit
//         }

//         /** Filters and pagination */
//         const totalProducts = allProducts.length;
//         const totalPages = Math.ceil(totalProducts / limit);
//         const start = (page - 1) * limit;
//         const paginated = allProducts.slice(start, start + limit);

//         const filters = {
//             brands: [...new Set(allProducts.map((p) => p.brand).filter(Boolean))],
//             conditions: [
//                 ...new Set(allProducts.map((p) => p.condition).filter(Boolean)),
//             ],
//             sellers: [...new Set(allProducts.map((p) => p.seller))],
//         };

//         /** Respond with structured data */
//         res.json({
//             totalProducts,
//             totalPages,
//             currentPage: page,
//             limit,
//             products: paginated,
//             filters,
//         });
//     } catch (err) {
//         console.error("❌ Error fetching charity products:", err);
//         res.status(500).json({
//             error: "Failed to fetch charity products",
//             details: err.message,
//         });
//     }
// };
// import fetch from "node-fetch";
// import dotenv from "dotenv";
// dotenv.config();

// /** 🔁 Helper — retry fetch for rate-limited eBay requests */
// async function fetchWithRetry(url, options, retries = 3, delay = 1500) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const res = await fetch(url, options);
//             if (res.status === 429) {
//                 console.warn(`⚠️ Rate limit hit. Retrying in ${delay}ms...`);
//                 await new Promise((r) => setTimeout(r, delay));
//                 continue;
//             }
//             return res;
//         } catch (err) {
//             console.warn(`⚠️ Network error on attempt ${i + 1}:`, err.message);
//             await new Promise((r) => setTimeout(r, delay));
//         }
//     }
//     throw new Error("Too many failed fetch attempts.");
// }

// /** 🧩 Helper — safely parse JSON with retries */
// async function safeJson(res, retries = 2) {
//     for (let i = 0; i <= retries; i++) {
//         try {
//             return await res.json();
//         } catch (err) {
//             if (i === retries) throw new Error("Invalid JSON after retries.");
//             console.warn("⚠️ Retrying JSON parse after failure...");
//             await new Promise((r) => setTimeout(r, 1000));
//         }
//     }
// }

// /** 🧩 Helper — build eBay filter query string */
// function buildEbayFilterString(filters = {}) {
//     const filterParts = [];
//     if (filters.seller) filterParts.push(`sellers:{${filters.seller}}`);
//     if (filters.brand) filterParts.push(`brands:{${filters.brand}}`);
//     if (filters.condition) filterParts.push(`conditions:{${filters.condition}}`);
//     if (filters.category) filterParts.push(`categoryIds:{${filters.category}}`);
//     return filterParts.length ? `&filter=${filterParts.join(",")}` : "";
// }

// /** 🎯 Controller — Fetch all charity products with pagination & filters */
// export const getAllCharityProducts = async (req, res) => {
//     const token = process.env.EBAY_OAUTH_TOKEN;
//     const campId = process.env.EPN_CAMPID;
//     const market = process.env.EBAY_MARKETPLACE_ID || "EBAY_GB";
//     const baseUrl = process.env.BASE_URL || "http://localhost:5000";

//     const { brand, condition, category } = req.query;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     if (!baseUrl.startsWith("http")) {
//         console.error("❌ Invalid BASE_URL! Must start with http:// or https://");
//         return res
//             .status(500)
//             .json({ error: "Invalid BASE_URL. Please fix in .env file." });
//     }

//     try {
//         /** 1️⃣ Get charity sellers */
//         let sellers = [];
//         try {
//             const charityRes = await fetch(`${baseUrl}/api/charity/charity-lists`);
//             const charityData = await charityRes.json();
//             const charities = charityData.charities || charityData || [];

//             sellers = charities
//                 .map((c) => c.seller || c.name?.toLowerCase().replace(/\s+/g, ""))
//                 .filter(Boolean);
//         } catch (err) {
//             console.warn("⚠️ Charity API failed. Using fallback sellers list.");
//         }

//         /** 🩹 fallback seller list */
//         if (sellers.length === 0) {
//             sellers = [
//                 "bhfshop",
//                 "cancerresearchukshop",
//                 "oxfamgb",
//                 "barnardoscharityshop",
//                 "rspcaofficial",
//                 "edenvalleyhospice",
//             ];
//         }

//         const limitedSellers = sellers.slice(0, 10);
//         console.log(`✅ Found ${limitedSellers.length} charity sellers.`);

//         /** 2️⃣ Prepare filter string */
//         const filterString = buildEbayFilterString({ brand, condition, category });
//         const allProducts = [];

//         /** 3️⃣ Fetch products from eBay for each charity seller */
//         for (const seller of limitedSellers) {
//             console.log(`🔍 Fetching listings for seller: ${seller}`);
//             let url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=charity&filter=sellers:{${seller}}${filterString}&limit=50`;
//             let hasMore = true;
//             let sellerProducts = [];

//             while (hasMore && sellerProducts.length < 300) {
//                 console.log("➡️ Fetching:", url);

//                 let r;
//                 try {
//                     r = await fetchWithRetry(url, {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                             "X-EBAY-C-MARKETPLACE-ID": market,
//                         },
//                     });
//                 } catch (fetchErr) {
//                     console.warn(`⚠️ Fetch failed for ${seller}:`, fetchErr.message);
//                     break;
//                 }

//                 if (!r.ok) {
//                     console.warn(`⚠️ HTTP ${r.status} for ${seller}`);
//                     break;
//                 }

//                 let data;
//                 try {
//                     data = await safeJson(r);
//                 } catch (parseErr) {
//                     console.warn(`⚠️ JSON parse failed for ${seller}:`, parseErr.message);
//                     break;
//                 }

//                 const items = data?.itemSummaries || [];
//                 if (items.length === 0) break;

//                 for (const p of items) {
//                     const match = p.itemWebUrl?.match(/\/itm\/(\d+)/);
//                     const cleanUrl = match
//                         ? `https://www.ebay.co.uk/itm/${match[1]}`
//                         : p.itemWebUrl;
//                     const affiliateUrl = `${cleanUrl}?campid=${campId}&customid=${seller}`;

//                     sellerProducts.push({
//                         title: p.title,
//                         price: p.price?.value,
//                         currency: p.price?.currency,
//                         image: p.image?.imageUrl,
//                         url: affiliateUrl,
//                         seller,
//                         brand: p.brand || "Unknown",
//                         category:
//                             p.categoryPath?.split(">").map((s) => s.trim()) || [
//                                 "Uncategorised",
//                             ],
//                         condition: p.condition || "Unknown",
//                         size: p.itemGroup?.itemGroupTitle || "N/A",
//                         location: p.itemLocation?.country,
//                     });

//                     if (sellerProducts.length >= 300) break;
//                 }

//                 if (data.next && sellerProducts.length < 300) {
//                     url = data.next;
//                     await new Promise((r) => setTimeout(r, 1200)); // avoid rate-limit
//                 } else {
//                     hasMore = false;
//                 }
//             }

//             console.log(`✅ Collected ${sellerProducts.length} items from ${seller}`);
//             allProducts.push(...sellerProducts);
//         }

//         /** 4️⃣ Group products by category */
//         const categoryCount = {};
//         for (const p of allProducts) {
//             const cat = p.category?.[p.category.length - 1] || "Uncategorised";
//             categoryCount[cat] = (categoryCount[cat] || 0) + 1;
//         }

//         // Filter categories with at least 200 products
//         const topCategories = Object.entries(categoryCount)
//             .filter(([_, count]) => count >= 200)
//             .sort((a, b) => b[1] - a[1])
//             .slice(0, 10)
//             .map(([cat]) => cat);

//         const filteredProducts = allProducts.filter((p) =>
//             topCategories.includes(p.category?.[p.category.length - 1])
//         );

//         /** 5️⃣ Build filters */
//         const filterSets = {
//             brands: [...new Set(filteredProducts.map((p) => p.brand).filter(Boolean))],
//             conditions: [
//                 ...new Set(filteredProducts.map((p) => p.condition).filter(Boolean)),
//             ],
//             categories: topCategories,
//             sizes: [
//                 ...new Set(
//                     filteredProducts
//                         .map((p) => p.size)
//                         .filter((s) => s && s !== "N/A")
//                 ),
//             ],
//         };

//         /** 6️⃣ Paginate results */
//         const totalProducts = filteredProducts.length;
//         const totalPages = Math.ceil(totalProducts / limit);
//         const start = (page - 1) * limit;
//         const end = start + limit;
//         const paginatedProducts = filteredProducts.slice(start, end);

//         /** 7️⃣ Send JSON response */
//         res.json({
//             totalProducts,
//             totalPages,
//             currentPage: page,
//             limit,
//             products: paginatedProducts,
//             filters: filterSets,
//             topCategories,
//         });
//     } catch (err) {
//         console.error("❌ Charity Products API error:", err);
//         res.status(500).json({ error: "Failed to fetch charity products" });
//     }
// };
import CharityProduct from "../../models/CharityProduct.model";

/**
 * @desc Get charity products (with pagination + filters)
 * @route GET /api/charity-products
 * @query page, limit, category, minPrice, maxPrice
 */
export const getCharityProducts = async (req, res) => {
    try {
        const {
            page = "1",
            limit,
            category,
            minPrice,
            maxPrice,
        } = req.query;

        const query = {};

        // 🧩 Filters
        if (category) query.category = category;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // 🧮 Pagination
        const pageNum = parseInt(page, 10);
        const limitNum = limit ? parseInt(limit, 10) : 0; // 0 = show all

        // Count total docs for pagination info
        const totalCount = await CharityProduct.countDocuments(query);

        // Query builder
        const productsQuery = CharityProduct.find(query).sort({ updatedAt: -1 });

        if (limitNum > 0) {
            productsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
        }

        const products = await productsQuery.exec();

        res.json({
            success: true,
            total: totalCount,
            page: limitNum > 0 ? pageNum : 1,
            pages: limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("❌ Error fetching charity products:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
