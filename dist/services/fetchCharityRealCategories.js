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
exports.fetchCharityRealCategories = fetchCharityRealCategories;
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = __importDefault(require("https"));
const CharityProduct_model_1 = __importDefault(require("../models/CharityProduct.model"));
const CharityShop_model_1 = __importDefault(require("../models/CharityShop.model"));
const ebayAuth_1 = require("../utils/ebayAuth");
const discoverCharityCategories_1 = require("../utils/discoverCharityCategories");
const agent = new https_1.default.Agent({ keepAlive: true });
const market = process.env.EBAY_MARKETPLACE_ID || 'EBAY_GB';
const campId = process.env.EPN_CAMPID || '123456';
function fetchProductsByCategory(charityId, sellerId, categoryId, categoryName) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = yield (0, ebayAuth_1.getValidToken)();
        const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?category_ids=${categoryId}&charity_ids=${charityId}&filter=sellers:{${sellerId}}&sort=newlyListed&limit=100`;
        const res = yield (0, node_fetch_1.default)(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': market,
            },
            agent,
        });
        if (!res.ok) {
            console.warn(`⚠️ eBay ${res.status} for ${categoryName}: ${yield res.text()}`);
            return [];
        }
        const data = yield res.json();
        const items = data.itemSummaries || [];
        return items.map((p) => {
            var _a, _b, _c;
            return ({
                itemId: p.itemId,
                title: p.title,
                charitySeller: sellerId,
                categoryId,
                categoryName,
                price: parseFloat(((_a = p.price) === null || _a === void 0 ? void 0 : _a.value) || 0),
                currency: (_b = p.price) === null || _b === void 0 ? void 0 : _b.currency,
                image: (_c = p.image) === null || _c === void 0 ? void 0 : _c.imageUrl,
                thumbnailImages: (p.thumbnailImages || []).map((i) => i.imageUrl),
                additionalImages: (p.additionalImages || []).map((i) => i.imageUrl),
                condition: p.condition,
                brand: p.brand,
                itemLocation: p.itemLocation,
                affiliateUrl: `${p.itemWebUrl}?campid=${campId}&customid=${sellerId}`,
                updatedAt: new Date(),
            });
        });
    });
}
function fetchCharityRealCategories(sellerId, charityId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n🎯 Discovering and fetching for ${sellerId}`);
        const categories = yield (0, discoverCharityCategories_1.discoverCharityCategories)(charityId, sellerId);
        let allProducts = [];
        for (const c of categories) {
            const products = yield fetchProductsByCategory(charityId, sellerId, c.id, c.name);
            console.log(`📦 ${products.length} new items in ${c.name}`);
            allProducts.push(...products);
            yield new Promise(r => setTimeout(r, 3000));
        }
        const uniqueProducts = Array.from(new Map(allProducts.map((p) => [p.itemId, p])).values());
        for (const product of uniqueProducts) {
            yield CharityProduct_model_1.default.findOneAndUpdate({ itemId: product.itemId }, { $set: product }, { upsert: true, new: true });
        }
        yield CharityShop_model_1.default.findOneAndUpdate({ seller: sellerId }, {
            $set: {
                seller: sellerId,
                userName: sellerId,
                totalProducts: uniqueProducts.length,
                lastUpdated: new Date(),
            },
        }, { upsert: true });
        console.log(`💾 Saved ${uniqueProducts.length} unique products for ${sellerId}`);
    });
}
