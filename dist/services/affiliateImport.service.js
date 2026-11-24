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
exports.importAffiliateProducts = importAffiliateProducts;
exports.listAffiliateProducts = listAffiliateProducts;
exports.updateAffiliateProduct = updateAffiliateProduct;
exports.removeAffiliateProduct = removeAffiliateProduct;
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const Charity_model_1 = __importDefault(require("../models/Charity.model"));
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
const affiliateApiMapper_service_js_1 = require("./affiliateApiMapper.service.js");
const ebayAffiliate_service_js_1 = require("./ebayAffiliate.service.js");
const productSlug_js_1 = require("../utils/productSlug.js");
const MAX_IMPORT = 50;
function linkProductToOwner(product, ownerId, ownerRole) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ownerRole === "ADMIN")
            return;
        const Model = ownerRole === "CHARITY" ? Charity_model_1.default : User_model_1.default;
        yield Model.findByIdAndUpdate(ownerId, {
            $addToSet: { listedProducts: product._id },
        });
    });
}
function importAffiliateProducts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ ownerId, ownerRole, connection, products: preloaded, }) {
        let mapped = preloaded;
        if (!mapped) {
            if (connection.provider === "ebay") {
                const feed = yield (0, ebayAffiliate_service_js_1.fetchEbayCuratedFeed)({ limit: MAX_IMPORT });
                mapped = feed.map((item) => ({
                    externalId: item.ebayItemId,
                    name: item.title,
                    price: item.price,
                    images: item.imageUrl ? [item.imageUrl] : [],
                    affiliateUrl: item.itemWebUrl,
                    category: "affiliate",
                    checkoutMode: "affiliate_redirect",
                    source: "ebay_affiliate",
                }));
            }
            else {
                const raw = yield (0, affiliateApiMapper_service_js_1.fetchAffiliateApi)({
                    apiUrl: connection.apiUrl,
                    apiKey: connection.apiKey,
                });
                mapped = (0, affiliateApiMapper_service_js_1.mapAffiliateApiResponse)(raw, connection.fieldMapping, connection.itemsPath).map((p) => (Object.assign(Object.assign({}, p), { affiliateUrl: (0, affiliateApiMapper_service_js_1.appendAffiliateTracking)(p.affiliateUrl, connection.affiliateId), checkoutMode: "affiliate_redirect", source: "ebay_affiliate" })));
            }
        }
        const slice = mapped.slice(0, MAX_IMPORT);
        const imported = [];
        const updated = [];
        for (const item of slice) {
            const price = parseFloat(item.price);
            if (!item.name || !price || price < 1)
                continue;
            const query = {
                seller: ownerId,
                $or: [
                    { ebayItemId: item.externalId },
                    { externalProductId: item.externalId },
                    { affiliateUrl: item.affiliateUrl },
                ],
            };
            let product = yield Product_model_1.default.findOne(query);
            const payload = {
                name: item.name,
                price,
                charityProfit: Math.round(price * platformPolicy_js_1.CHARITY_SHARE_RATE * 100) / 100,
                category: item.category || "affiliate",
                additionalInfo: item.additionalInfo || "",
                images: (item.images || []).slice(0, 10).map((url) => ({
                    url: String(url),
                    altText: item.name,
                })),
                quantity: 1,
                stockRemaining: 1,
                seller: ownerId,
                charity: ownerRole === "CHARITY" ? ownerId : item.charityId,
                source: item.source || "ebay_affiliate",
                checkoutMode: item.checkoutMode || "affiliate_redirect",
                ebayItemId: item.externalId,
                ebayAffiliateUrl: item.affiliateUrl,
                affiliateUrl: item.affiliateUrl,
                affiliatePartnerId: (connection === null || connection === void 0 ? void 0 : connection.affiliateId) || "",
                externalProductId: item.externalId,
                status: "LIVE",
                isArchived: false,
            };
            if (!product) {
                payload.slug = yield (0, productSlug_js_1.buildUniqueProductSlug)(item.name);
                product = new Product_model_1.default(payload);
                yield product.save();
                yield linkProductToOwner(product, ownerId, ownerRole);
                imported.push(product);
            }
            else {
                const nameChanged = item.name && item.name !== product.name;
                Object.assign(product, payload);
                if (nameChanged) {
                    product.slug = yield (0, productSlug_js_1.buildUniqueProductSlug)(item.name, product._id);
                }
                yield product.save();
                updated.push(product);
            }
        }
        return { importedCount: imported.length, updatedCount: updated.length, imported, updated };
    });
}
function listAffiliateProducts(ownerId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Product_model_1.default.find({
            seller: ownerId,
            checkoutMode: { $in: ["ebay_redirect", "affiliate_redirect"] },
            isArchived: false,
        }).sort({ updatedAt: -1 });
    });
}
function updateAffiliateProduct(ownerId, productId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const product = yield Product_model_1.default.findOne({
            _id: productId,
            seller: ownerId,
            checkoutMode: { $in: ["ebay_redirect", "affiliate_redirect"] },
        });
        if (!product)
            throw new Error("Affiliate product not found.");
        const allowed = [
            "name",
            "price",
            "additionalInfo",
            "category",
            "affiliateUrl",
            "ebayAffiliateUrl",
        ];
        for (const key of allowed) {
            if (updates[key] !== undefined)
                product[key] = updates[key];
        }
        if (updates.price) {
            product.charityProfit =
                Math.round(parseFloat(updates.price) * platformPolicy_js_1.CHARITY_SHARE_RATE * 100) / 100;
        }
        yield product.save();
        return product;
    });
}
function removeAffiliateProduct(ownerId, productId) {
    return __awaiter(this, void 0, void 0, function* () {
        const product = yield Product_model_1.default.findOneAndUpdate({ _id: productId, seller: ownerId }, { status: "REMOVED", isArchived: true }, { new: true });
        if (!product)
            throw new Error("Affiliate product not found.");
        return product;
    });
}
