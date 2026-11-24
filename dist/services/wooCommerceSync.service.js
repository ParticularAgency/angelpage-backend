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
exports.fetchWooCommerceProducts = fetchWooCommerceProducts;
exports.testWooCommerceConnection = testWooCommerceConnection;
const axios_1 = __importDefault(require("axios"));
function mapWooProduct(p) {
    var _a, _b, _c;
    const price = p.price ? parseFloat(p.price) : parseFloat(p.regular_price);
    const images = (p.images || []).map((img) => img.src).filter(Boolean);
    return {
        source: "woocommerce_sync",
        wooCommerceProductId: String(p.id),
        externalProductId: String(p.id),
        externalProductUrl: p.permalink,
        name: p.name,
        price,
        category: ((_b = (_a = p.categories) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name) || "general",
        brand: "",
        additionalInfo: ((_c = p.short_description) === null || _c === void 0 ? void 0 : _c.replace(/<[^>]+>/g, " ").slice(0, 500)) || "",
        quantity: p.stock_quantity > 0 ? p.stock_quantity : 1,
        images,
    };
}
function fetchWooCommerceProducts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ storeUrl, consumerKey, consumerSecret, }) {
        var _b;
        const base = storeUrl.replace(/\/$/, "");
        if (consumerKey && consumerSecret) {
            const res = yield axios_1.default.get(`${base}/wp-json/wc/v3/products`, {
                params: { per_page: 50, status: "publish", consumer_key: consumerKey, consumer_secret: consumerSecret },
                timeout: 20000,
            });
            return (res.data || []).map(mapWooProduct).filter((p) => p.price && p.name);
        }
        const res = yield axios_1.default.get(`${base}/wp-json/wc/store/products`, {
            params: { per_page: 50 },
            timeout: 20000,
            validateStatus: (s) => s < 500,
        });
        const list = Array.isArray(res.data) ? res.data : ((_b = res.data) === null || _b === void 0 ? void 0 : _b.products) || [];
        if (res.status >= 400 || !list.length) {
            throw new Error("WooCommerce API keys are required for this store. Enter Consumer key and Consumer secret.");
        }
        return list
            .map((p) => {
            var _a, _b, _c, _d;
            return ({
                source: "woocommerce_sync",
                wooCommerceProductId: String(p.id),
                externalProductId: String(p.id),
                externalProductUrl: p.permalink,
                name: p.name,
                price: parseFloat(((_a = p.prices) === null || _a === void 0 ? void 0 : _a.price) || p.price || 0) / (((_b = p.prices) === null || _b === void 0 ? void 0 : _b.currency_minor_unit) === 2 ? 100 : 1),
                category: ((_d = (_c = p.categories) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.name) || "general",
                images: (p.images || []).map((i) => i.src || i.thumbnail).filter(Boolean),
                quantity: 1,
            });
        })
            .filter((p) => p.price >= 1 && p.name);
    });
}
function testWooCommerceConnection(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const products = yield fetchWooCommerceProducts(config);
        return { ok: true, sampleCount: products.length };
    });
}
