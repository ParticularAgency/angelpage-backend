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
exports.detectStorePlatform = detectStorePlatform;
const axios_1 = __importDefault(require("axios"));
const FETCH_TIMEOUT = 12000;
function normalizeUrl(input) {
    if (!(input === null || input === void 0 ? void 0 : input.trim()))
        return null;
    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    try {
        const parsed = new URL(url);
        return parsed.origin;
    }
    catch (_a) {
        return null;
    }
}
function fetchSite(origin) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield axios_1.default.get(origin, {
            timeout: FETCH_TIMEOUT,
            maxRedirects: 5,
            validateStatus: (s) => s < 500,
            headers: {
                "User-Agent": "AngelpageBot/1.0 (+https://angelpage.co.uk)",
                Accept: "text/html,application/json",
            },
        });
        return { status: res.status, html: String(res.data || ""), headers: res.headers };
    });
}
function probeJson(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield axios_1.default.get(url, {
                timeout: FETCH_TIMEOUT,
                validateStatus: (s) => s < 500,
            });
            if (res.status >= 400)
                return null;
            return res.data;
        }
        catch (_a) {
            return null;
        }
    });
}
/**
 * Detect e-commerce platform from store URL.
 * @returns {Promise<{ platform, storeUrl, shopifyDomain?, canUsePublicApi, canScrape, requiredFields, message }>}
 */
function detectStorePlatform(storeUrlInput) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const storeUrl = normalizeUrl(storeUrlInput);
        if (!storeUrl) {
            throw new Error("Please enter a valid website URL.");
        }
        const host = new URL(storeUrl).hostname.toLowerCase();
        let platform = "unknown";
        let shopifyDomain = null;
        let canUsePublicApi = false;
        let canScrape = false;
        let message = "";
        if (host.includes("myshopify.com")) {
            platform = "shopify";
            shopifyDomain = host;
            canUsePublicApi = true;
            message = "Shopify store detected. You can sync via API key or public catalog.";
        }
        else {
            const { status, html, headers } = yield fetchSite(storeUrl);
            if (status >= 400) {
                throw new Error("Could not reach that website. Check the URL and try again.");
            }
            const lower = html.toLowerCase();
            const poweredBy = String(headers["x-shopify-stage"] || headers["x-shopid"] || "");
            if (lower.includes("cdn.shopify.com") ||
                lower.includes("shopify.theme") ||
                lower.includes("myshopify.com") ||
                poweredBy) {
                platform = "shopify";
                canUsePublicApi = true;
                message = "Shopify storefront detected.";
            }
            else if (lower.includes("woocommerce") ||
                lower.includes("wp-content/plugins/woocommerce") ||
                lower.includes("/wp-json/wc/")) {
                platform = "woocommerce";
                message = "WooCommerce / WordPress store detected. API keys are required.";
            }
            else if (lower.includes("wp-content") || lower.includes("wordpress")) {
                platform = "wordpress";
                message =
                    "WordPress site detected. WooCommerce API keys may be required for products.";
            }
            canScrape =
                lower.includes('type":"product"') ||
                    lower.includes("product-item") ||
                    lower.includes("woocommerce-loop") ||
                    lower.includes("grid-product") ||
                    html.includes("@type\":\"Product\"");
        }
        if (platform === "shopify") {
            const productsJson = yield probeJson(`${storeUrl}/products.json?limit=1`);
            if ((_a = productsJson === null || productsJson === void 0 ? void 0 : productsJson.products) === null || _a === void 0 ? void 0 : _a.length) {
                canUsePublicApi = true;
            }
        }
        if (platform === "woocommerce") {
            const wcProbe = yield probeJson(`${storeUrl}/wp-json/wc/store/products?per_page=1`);
            if ((wcProbe === null || wcProbe === void 0 ? void 0 : wcProbe.length) || ((_b = wcProbe === null || wcProbe === void 0 ? void 0 : wcProbe.products) === null || _b === void 0 ? void 0 : _b.length)) {
                canUsePublicApi = true;
                message += " Public WooCommerce store API is available.";
            }
        }
        if (platform === "unknown") {
            const productsJson = yield probeJson(`${storeUrl}/products.json?limit=1`);
            if ((_c = productsJson === null || productsJson === void 0 ? void 0 : productsJson.products) === null || _c === void 0 ? void 0 : _c.length) {
                platform = "shopify";
                canUsePublicApi = true;
                message = "Shopify-style product feed found at /products.json.";
            }
            else if (canScrape) {
                platform = "scrape";
                message =
                    "No known API detected. Angelpage can try to import products by reading your shop pages.";
            }
            else {
                throw new Error("Sorry, the website is not able to be scraped. Try entering a Shopify or WooCommerce API key, or add products manually.");
            }
        }
        const requiredFields = platform === "shopify"
            ? ["apiKeyOptional"]
            : platform === "woocommerce"
                ? ["apiKey", "apiSecret"]
                : platform === "scrape"
                    ? []
                    : ["apiKeyOptional"];
        return {
            platform,
            storeUrl,
            shopifyDomain,
            canUsePublicApi,
            canScrape,
            requiredFields,
            message: message ||
                "Store detected. Connect with an API key or sync automatically where supported.",
        };
    });
}
