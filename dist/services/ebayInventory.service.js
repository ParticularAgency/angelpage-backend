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
exports.endEbayListingForProduct = endEbayListingForProduct;
exports.syncStockAfterAngelpageSale = syncStockAfterAngelpageSale;
/**
 * eBay inventory sync — delist / end item when sold on Angelpage.
 * Requires EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, seller OAuth scopes for sell.inventory
 */
const ebayAuth_js_1 = require("../utils/ebayAuth.js");
const Product_model_1 = __importDefault(require("../models/Product.model"));
const EBAY_API_BASE = process.env.EBAY_ENV === "PRODUCTION"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
function endEbayListingForProduct(productId) {
    return __awaiter(this, void 0, void 0, function* () {
        const product = yield Product_model_1.default.findById(productId).select("ebayItemId ebayOfferId source name");
        if (!(product === null || product === void 0 ? void 0 : product.ebayItemId) || product.source !== "ebay_sync") {
            return { skipped: true, reason: "Not an eBay-synced listing" };
        }
        const token = yield (0, ebayAuth_js_1.getValidToken)();
        const offerId = product.ebayOfferId;
        if (offerId) {
            const res = yield fetch(`${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/withdraw`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) {
                const err = yield res.text();
                console.error("eBay withdraw failed:", err);
                return { success: false, error: err };
            }
        }
        product.status = "REMOVED";
        product.isArchived = true;
        product.stockRemaining = 0;
        yield product.save();
        return { success: true, productId: product._id };
    });
}
function syncStockAfterAngelpageSale() {
    return __awaiter(this, arguments, void 0, function* (productIds = []) {
        const results = [];
        for (const id of productIds) {
            try {
                results.push(yield endEbayListingForProduct(id));
            }
            catch (err) {
                results.push({ productId: id, success: false, error: err.message });
            }
        }
        return results;
    });
}
