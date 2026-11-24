"use strict";
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
exports.discoverCharityCategories = discoverCharityCategories;
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = __importDefault(require("https"));
const ebayAuth_1 = require("../utils/ebayAuth");
const CharityCategory_model_1 = __importDefault(require("../models/CharityCategory.model"));
const agent = new https_1.default.Agent({ keepAlive: true });
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
function discoverCharityCategories(charityId, sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const categoriesMap = new Map();
        const token = yield (0, ebayAuth_1.getValidToken)();
        for (const q of CATEGORY_QUERIES) {
            //  hybrid logic: include q only if non-empty
            const baseUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?charity_ids=${charityId}&filter=sellers:{${sellerId}}&limit=1&facet=categoryId`;
            const url = q ? `${baseUrl}&q=${encodeURIComponent(q)}` : baseUrl;
            console.log(`🔍 Discovering categories for ${sellerId} via keyword: "${q}"`);
            let res;
            try {
                res = yield (0, node_fetch_1.default)(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-EBAY-C-MARKETPLACE-ID': market,
                    },
                    agent,
                });
            }
            catch (err) {
                console.warn(`⚠️ Network error during fetch for ${sellerId}`);
                continue;
            }
            if (res.status === 429 || res.status === 503) {
                console.warn(`⚠️ Rate limited (${res.status}) — retrying after 5s...`);
                yield new Promise(r => setTimeout(r, 5000));
                continue;
            }
            if (!res.ok) {
                console.warn(`⚠️ eBay ${res.status} for ${sellerId}: ${yield res.text()}`);
                continue;
            }
            const data = yield res.json();
            const list = data.categoryDistribution || [];
            for (const c of list) {
                if (!c.categoryId || !c.categoryName)
                    continue;
                const existing = categoriesMap.get(c.categoryId);
                if (!existing) {
                    categoriesMap.set(c.categoryId, {
                        id: c.categoryId,
                        name: c.categoryName,
                        count: c.count || 0,
                    });
                }
                else {
                    // merge counts from multiple queries
                    existing.count += c.count || 0;
                }
            }
            yield new Promise(r => setTimeout(r, 1500)); // gentle delay between calls
        }
        //  Filter out very low count categories
        const categories = Array.from(categoriesMap.values()).filter(c => c.count >= 5);
        console.log(` Found ${categories.length} active categories for ${sellerId}`);
        //  Upsert to MongoDB
        yield CharityCategory_model_1.default.findOneAndUpdate({ charityId, seller: sellerId }, {
            $set: {
                categories,
                updatedAt: new Date(),
            },
        }, { upsert: true });
        return categories;
    });
}
