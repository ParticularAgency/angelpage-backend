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
exports.normalizeExternalProduct = normalizeExternalProduct;
exports.upsertImportedProducts = upsertImportedProducts;
const Product_model_1 = __importDefault(require("../models/Product.model"));
const Charity_model_1 = __importDefault(require("../models/Charity.model"));
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
const MAX_SYNC_PRODUCTS = 50;
/**
 * Normalize external catalog item → Mongo Product fields.
 */
function normalizeExternalProduct(item, charity) {
    const price = parseFloat(item.price);
    if (!price || Number.isNaN(price) || price < 1) {
        return null;
    }
    const images = (item.images || [])
        .filter(Boolean)
        .slice(0, 10)
        .map((url) => ({ url: String(url), altText: item.name || "" }));
    return {
        name: String(item.name || "Imported product").slice(0, 200),
        price,
        charityProfit: Math.round(price * platformPolicy_js_1.CHARITY_SHARE_RATE * 100) / 100,
        category: item.category || "general",
        subcategory: item.subcategory || "",
        condition: item.condition || "Good",
        brand: item.brand || "",
        additionalInfo: item.additionalInfo || item.description || "",
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        images,
        source: item.source,
        shopifyProductId: item.shopifyProductId || undefined,
        wooCommerceProductId: item.wooCommerceProductId || undefined,
        ebayItemId: item.ebayItemId || undefined,
        ebayAffiliateUrl: item.ebayAffiliateUrl || undefined,
        externalProductUrl: item.externalProductUrl || undefined,
        externalProductId: item.externalProductId || undefined,
        checkoutMode: item.checkoutMode || "stripe",
        charity: charity._id,
        seller: charity._id,
        selectedCharityId: String(charity._id),
        selectedCharityName: charity.charityName || "",
        selectCharityName: charity.charityName || "",
    };
}
function upsertImportedProducts(charityId_1, items_1) {
    return __awaiter(this, arguments, void 0, function* (charityId, items, { autoPublish = true } = {}) {
        const charity = yield Charity_model_1.default.findById(charityId);
        if (!charity) {
            throw new Error("Charity not found");
        }
        const slice = items.slice(0, MAX_SYNC_PRODUCTS);
        const imported = [];
        const updated = [];
        const skipped = [];
        for (const raw of slice) {
            const normalized = normalizeExternalProduct(raw, charity);
            if (!normalized) {
                skipped.push({ name: raw === null || raw === void 0 ? void 0 : raw.name, reason: "Invalid price or name" });
                continue;
            }
            const orConditions = [];
            if (normalized.shopifyProductId) {
                orConditions.push({ shopifyProductId: normalized.shopifyProductId });
            }
            if (normalized.wooCommerceProductId) {
                orConditions.push({ wooCommerceProductId: normalized.wooCommerceProductId });
            }
            if (normalized.ebayItemId) {
                orConditions.push({ ebayItemId: normalized.ebayItemId });
            }
            if (normalized.externalProductId) {
                orConditions.push({
                    externalProductId: normalized.externalProductId,
                    source: normalized.source,
                });
            }
            if (normalized.externalProductUrl) {
                orConditions.push({ externalProductUrl: normalized.externalProductUrl });
            }
            let product = orConditions.length > 0
                ? yield Product_model_1.default.findOne({ charity: charity._id, $or: orConditions })
                : null;
            const status = autoPublish ? "LIVE" : "PENDING_REVIEW";
            const stock = normalized.quantity;
            if (!product) {
                product = new Product_model_1.default(Object.assign(Object.assign({}, normalized), { stockRemaining: stock, status, isArchived: false }));
                yield product.save();
                yield Charity_model_1.default.findByIdAndUpdate(charity._id, {
                    $addToSet: { listedProducts: product._id },
                });
                imported.push(product);
            }
            else {
                Object.assign(product, {
                    name: normalized.name,
                    price: normalized.price,
                    charityProfit: normalized.charityProfit,
                    category: normalized.category,
                    subcategory: normalized.subcategory,
                    condition: normalized.condition,
                    brand: normalized.brand,
                    additionalInfo: normalized.additionalInfo,
                    images: normalized.images.length ? normalized.images : product.images,
                    quantity: stock,
                    stockRemaining: stock,
                    source: normalized.source,
                    externalProductUrl: normalized.externalProductUrl,
                    status: product.status === "REMOVED" ? status : product.status,
                    isArchived: false,
                });
                yield product.save();
                updated.push(product);
            }
        }
        return {
            importedCount: imported.length,
            updatedCount: updated.length,
            skippedCount: skipped.length,
            skipped,
            totalListed: yield Product_model_1.default.countDocuments({
                charity: charity._id,
                status: { $in: ["LIVE", "PENDING_REVIEW"] },
                isArchived: false,
            }),
        };
    });
}
