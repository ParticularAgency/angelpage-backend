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
exports.fetchEbayCuratedFeed = fetchEbayCuratedFeed;
/**
 * eBay Partner Network / curated item feed integration scaffold.
 * Docs: https://developer.ebay.com/api-docs/buy/marketing/overview.html
 *
 * Requires: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID (affiliate)
 */
const node_fetch_1 = __importDefault(require("node-fetch"));
const ebayAuth_js_1 = require("../utils/ebayAuth.js");
const EBAY_ENV = process.env.EBAY_ENV || "PRODUCTION";
const EBAY_API_BASE = EBAY_ENV === "PRODUCTION"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
const CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID;
const AFFILIATE_REFERENCE_ID = process.env.EBAY_AFFILIATE_REFERENCE_ID || "angelpage";
/**
 * Fetch curated affiliate items (paginated).
 * Returns normalized products for Angelpage catalog display.
 */
function fetchEbayCuratedFeed() {
    return __awaiter(this, arguments, void 0, function* ({ limit = 50, offset = 0 } = {}) {
        if (!CAMPAIGN_ID) {
            throw new Error("EBAY_CAMPAIGN_ID is not configured. Sign up for eBay Partner Network first.");
        }
        const token = yield (0, ebayAuth_js_1.getValidToken)();
        const url = new URL(`${EBAY_API_BASE}/buy/marketing/v1_beta/merchandised_product`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));
        const res = yield (0, node_fetch_1.default)(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
                "X-EBAY-C-ENDUSERCTX": `affiliateCampaignId=${CAMPAIGN_ID},affiliateReferenceId=${AFFILIATE_REFERENCE_ID}`,
            },
        });
        if (!res.ok) {
            const errText = yield res.text();
            throw new Error(`eBay feed error ${res.status}: ${errText}`);
        }
        const data = yield res.json();
        const items = data.merchandisedProducts || data.items || [];
        return items.map(item => {
            var _a, _b, _c, _d, _e;
            return ({
                source: "ebay_affiliate",
                ebayItemId: item.itemId || item.legacyItemId,
                title: item.title,
                price: ((_a = item.price) === null || _a === void 0 ? void 0 : _a.value) ? parseFloat(item.price.value) : null,
                currency: ((_b = item.price) === null || _b === void 0 ? void 0 : _b.currency) || "GBP",
                imageUrl: ((_c = item.image) === null || _c === void 0 ? void 0 : _c.imageUrl) || ((_e = (_d = item.thumbnailImages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.imageUrl),
                itemWebUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
                condition: item.condition,
                charityProfit: null,
                checkoutMode: "ebay_redirect",
            });
        });
    });
}
