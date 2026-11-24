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
exports.fetchScrapedProducts = fetchScrapedProducts;
exports.testScrapeConnection = testScrapeConnection;
const axios_1 = __importDefault(require("axios"));
function extractJsonLdProducts(html) {
    const products = [];
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        try {
            const data = JSON.parse(match[1]);
            const nodes = Array.isArray(data) ? data : [data];
            for (const node of nodes) {
                if (node["@type"] === "Product") {
                    products.push(node);
                }
                if (node["@graph"]) {
                    for (const g of node["@graph"]) {
                        if (g["@type"] === "Product")
                            products.push(g);
                    }
                }
                if (node["@type"] === "ItemList" && node.itemListElement) {
                    for (const el of node.itemListElement) {
                        const item = el.item || el;
                        if (item["@type"] === "Product")
                            products.push(item);
                    }
                }
            }
        }
        catch (_a) {
            /* ignore malformed JSON-LD */
        }
    }
    return products;
}
function scrapeLinkProducts(html, baseUrl) {
    const links = [];
    const linkRegex = /href=["']([^"']*\/product[^"']*)["']/gi;
    let m;
    while ((m = linkRegex.exec(html)) && links.length < 30) {
        try {
            const href = m[1].startsWith("http") ? m[1] : new URL(m[1], baseUrl).href;
            if (!links.includes(href))
                links.push(href);
        }
        catch (_a) {
            /* skip */
        }
    }
    return links;
}
function scrapeProductPage(url) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const res = yield axios_1.default.get(url, {
            timeout: 12000,
            headers: { "User-Agent": "AngelpageBot/1.0" },
            validateStatus: (s) => s < 500,
        });
        if (res.status >= 400)
            return null;
        const html = String(res.data || "");
        const jsonLd = extractJsonLdProducts(html);
        if (jsonLd.length) {
            const p = jsonLd[0];
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
            const price = parseFloat((offer === null || offer === void 0 ? void 0 : offer.price) || (offer === null || offer === void 0 ? void 0 : offer.lowPrice) || 0);
            const image = Array.isArray(p.image) ? p.image[0] : p.image;
            return {
                source: "scrape_sync",
                externalProductId: url,
                externalProductUrl: url,
                name: p.name,
                price,
                category: "general",
                images: image ? [image] : [],
                additionalInfo: ((_b = (_a = p.description) === null || _a === void 0 ? void 0 : _a.slice) === null || _b === void 0 ? void 0 : _b.call(_a, 0, 300)) || "",
                quantity: 1,
            };
        }
        const titleMatch = html.match(/<h1[^>]*>([^<]+)</i);
        const priceMatch = html.match(/£\s?([\d,.]+)|\$\s?([\d,.]+)/);
        const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const name = (_c = titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[1]) === null || _c === void 0 ? void 0 : _c.trim();
        const price = parseFloat(((priceMatch === null || priceMatch === void 0 ? void 0 : priceMatch[1]) || (priceMatch === null || priceMatch === void 0 ? void 0 : priceMatch[2]) || "").replace(/,/g, ""));
        if (!name || !price || price < 1)
            return null;
        return {
            source: "scrape_sync",
            externalProductId: url,
            externalProductUrl: url,
            name,
            price,
            category: "general",
            images: (imgMatch === null || imgMatch === void 0 ? void 0 : imgMatch[1]) ? [imgMatch[1]] : [],
            quantity: 1,
        };
    });
}
function fetchScrapedProducts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ storeUrl }) {
        const base = storeUrl.replace(/\/$/, "");
        const res = yield axios_1.default.get(base, {
            timeout: 12000,
            headers: { "User-Agent": "AngelpageBot/1.0" },
            validateStatus: (s) => s < 500,
        });
        if (res.status >= 400) {
            throw new Error("Sorry, the website is not able to be scraped.");
        }
        const html = String(res.data || "");
        let products = extractJsonLdProducts(html).map((p) => {
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
            const price = parseFloat((offer === null || offer === void 0 ? void 0 : offer.price) || (offer === null || offer === void 0 ? void 0 : offer.lowPrice) || 0);
            const image = Array.isArray(p.image) ? p.image[0] : p.image;
            return {
                source: "scrape_sync",
                externalProductId: p.url || p["@id"] || p.name,
                externalProductUrl: p.url || storeUrl,
                name: p.name,
                price,
                category: "general",
                images: image ? [image] : [],
                quantity: 1,
            };
        }).filter((p) => p.name && p.price >= 1);
        if (!products.length) {
            const shopPaths = ["/shop", "/products", "/collections/all", "/store"];
            for (const path of shopPaths) {
                try {
                    const shopRes = yield axios_1.default.get(`${base}${path}`, {
                        timeout: 10000,
                        headers: { "User-Agent": "AngelpageBot/1.0" },
                    });
                    const shopHtml = String(shopRes.data || "");
                    products = extractJsonLdProducts(shopHtml)
                        .map((p) => {
                        const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                        return {
                            source: "scrape_sync",
                            externalProductId: p.url || p.name,
                            externalProductUrl: p.url || `${base}${path}`,
                            name: p.name,
                            price: parseFloat((offer === null || offer === void 0 ? void 0 : offer.price) || 0),
                            category: "general",
                            images: [],
                            quantity: 1,
                        };
                    })
                        .filter((p) => p.name && p.price >= 1);
                    if (products.length)
                        break;
                    const links = scrapeLinkProducts(shopHtml, base);
                    for (const link of links.slice(0, 15)) {
                        const item = yield scrapeProductPage(link);
                        if (item)
                            products.push(item);
                    }
                    if (products.length)
                        break;
                }
                catch (_b) {
                    /* try next path */
                }
            }
        }
        if (!products.length) {
            throw new Error("Sorry, the website is not able to be scraped. Try an API key or manual listing.");
        }
        const seen = new Set();
        return products.filter((p) => {
            const key = p.externalProductId || p.name;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    });
}
function testScrapeConnection(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const products = yield fetchScrapedProducts(config);
        return { ok: true, sampleCount: products.length };
    });
}
