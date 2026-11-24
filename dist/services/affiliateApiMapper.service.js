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
exports.getByPath = getByPath;
exports.mapAffiliateApiResponse = mapAffiliateApiResponse;
exports.fetchAffiliateApi = fetchAffiliateApi;
exports.appendAffiliateTracking = appendAffiliateTracking;
const axios_1 = __importDefault(require("axios"));
function getByPath(obj, path) {
    if (!path)
        return obj;
    return String(path)
        .split(".")
        .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}
function mapAffiliateApiResponse(raw, mapping = {}, itemsPath = "products") {
    const defaults = Object.assign({ title: "title", price: "price", image: "image", description: "description", url: "url", id: "id" }, mapping);
    let items = getByPath(raw, itemsPath);
    if (!Array.isArray(items)) {
        if (Array.isArray(raw))
            items = raw;
        else if (raw === null || raw === void 0 ? void 0 : raw.items)
            items = raw.items;
        else if ((raw === null || raw === void 0 ? void 0 : raw.data) && Array.isArray(raw.data))
            items = raw.data;
        else
            items = [];
    }
    return items
        .map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const title = getByPath(item, defaults.title) || item.name || item.product_title;
        const priceRaw = (_c = (_a = getByPath(item, defaults.price)) !== null && _a !== void 0 ? _a : (_b = item.price) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_e = (_d = item.variants) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.price;
        const price = parseFloat(String(priceRaw).replace(/[^\d.]/g, ""));
        const image = getByPath(item, defaults.image) ||
            ((_f = item.image) === null || _f === void 0 ? void 0 : _f.url) ||
            ((_h = (_g = item.images) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.src) ||
            ((_k = (_j = item.thumbnailImages) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.imageUrl);
        const url = getByPath(item, defaults.url) ||
            item.itemWebUrl ||
            item.permalink ||
            item.link;
        const id = getByPath(item, defaults.id) ||
            item.itemId ||
            item.legacyItemId ||
            item.sku;
        const description = getByPath(item, defaults.description) ||
            item.body_html ||
            item.short_description ||
            "";
        if (!title || !price || Number.isNaN(price))
            return null;
        return {
            externalId: String(id || title),
            name: String(title).slice(0, 200),
            price,
            images: image ? [image] : [],
            additionalInfo: String(description).replace(/<[^>]+>/g, " ").slice(0, 500),
            affiliateUrl: url,
            category: item.category || item.product_type || "affiliate",
        };
    })
        .filter(Boolean);
}
function fetchAffiliateApi(_a) {
    return __awaiter(this, arguments, void 0, function* ({ apiUrl, apiKey, headers = {} }) {
        const config = {
            method: "GET",
            url: apiUrl,
            timeout: 25000,
            headers: Object.assign({ Accept: "application/json" }, headers),
        };
        if (apiKey) {
            config.headers.Authorization = `Bearer ${apiKey}`;
            config.headers["X-API-Key"] = apiKey;
        }
        const res = yield (0, axios_1.default)(config);
        return res.data;
    });
}
function appendAffiliateTracking(url, affiliateId) {
    if (!url || !affiliateId)
        return url;
    try {
        const u = new URL(url);
        u.searchParams.set("affiliate_id", affiliateId);
        u.searchParams.set("utm_source", "angelpage");
        u.searchParams.set("utm_medium", "affiliate");
        return u.toString();
    }
    catch (_a) {
        return url;
    }
}
