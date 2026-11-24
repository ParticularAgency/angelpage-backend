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
exports.fetchShopifyProducts = fetchShopifyProducts;
exports.testShopifyConnection = testShopifyConnection;
exports.delistShopifyProductOnSale = delistShopifyProductOnSale;
const axios_1 = __importDefault(require("axios"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
function shopifyBase(storeUrl, shopifyDomain) {
    if (shopifyDomain) {
        return `https://${shopifyDomain}`;
    }
    return storeUrl.replace(/\/$/, "");
}
function mapShopifyProduct(p) {
    var _a, _b;
    const variant = (_a = p.variants) === null || _a === void 0 ? void 0 : _a[0];
    const price = (variant === null || variant === void 0 ? void 0 : variant.price) ? parseFloat(variant.price) : null;
    const images = (p.images || []).map((img) => img.src).filter(Boolean);
    return {
        source: "shopify_sync",
        shopifyProductId: String(p.id),
        externalProductId: String(p.id),
        externalProductUrl: p.handle ? undefined : undefined,
        name: p.title,
        price,
        category: p.product_type || "general",
        brand: p.vendor || "",
        additionalInfo: ((_b = p.body_html) === null || _b === void 0 ? void 0 : _b.replace(/<[^>]+>/g, " ").slice(0, 500)) || "",
        quantity: (variant === null || variant === void 0 ? void 0 : variant.inventory_quantity) > 0 ? variant.inventory_quantity : 1,
        images,
    };
}
/**
 * Fetch products from Shopify Admin API or public products.json.
 */
function fetchShopifyProducts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ storeUrl, shopifyDomain, accessToken }) {
        var _b, _c, _d;
        const base = shopifyBase(storeUrl, shopifyDomain);
        if (accessToken) {
            const adminHost = shopifyDomain || new URL(storeUrl).hostname;
            const adminBase = adminHost.includes("myshopify.com")
                ? `https://${adminHost}`
                : `https://${adminHost}`;
            const res = yield axios_1.default.get(`${adminBase}/admin/api/2024-01/products.json?limit=50&status=active`, {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                },
                timeout: 20000,
            });
            return (((_b = res.data) === null || _b === void 0 ? void 0 : _b.products) || [])
                .map((p) => (Object.assign(Object.assign({}, mapShopifyProduct(p)), { externalProductUrl: p.handle ? `${base}/products/${p.handle}` : undefined })))
                .filter((p) => p.price && p.name);
        }
        const res = yield axios_1.default.get(`${base}/products.json?limit=50`, {
            timeout: 20000,
            validateStatus: (s) => s < 500,
        });
        if (res.status >= 400 || !((_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.products) === null || _d === void 0 ? void 0 : _d.length)) {
            throw new Error("Could not read Shopify products. Add an Admin API access token for private stores.");
        }
        return res.data.products
            .map((p) => (Object.assign(Object.assign({}, mapShopifyProduct(p)), { externalProductUrl: p.handle ? `${base}/products/${p.handle}` : undefined })))
            .filter((p) => p.price && p.name);
    });
}
function testShopifyConnection(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const products = yield fetchShopifyProducts(config);
        return { ok: true, sampleCount: products.length };
    });
}
function delistShopifyProductOnSale(productId) {
    return __awaiter(this, void 0, void 0, function* () {
        const product = yield Product_model_1.default.findById(productId);
        if (!(product === null || product === void 0 ? void 0 : product.shopifyProductId) || product.source !== "shopify_sync") {
            return { skipped: true };
        }
        product.stockRemaining = 0;
        product.status = "REMOVED";
        yield product.save();
        return { success: true };
    });
}
