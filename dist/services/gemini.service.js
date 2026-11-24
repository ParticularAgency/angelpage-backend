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
exports.isGeminiConfigured = exports.searchProductsByImage = exports.smartProductSearch = exports.suggestEvent = exports.enhanceBlogSeo = exports.enhanceListing = exports.analyzeProductImage = void 0;
const Product_model_1 = __importDefault(require("../models/Product.model"));
const productCategories_js_1 = require("../constants/productCategories.js");
const getGeminiApiKey = () => (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
const getGeminiModel = () => process.env.GEMINI_MODEL || "gemini-2.0-flash";
const categoryListText = () => productCategories_js_1.PRODUCT_CATEGORIES.map((c) => `${c.name}: ${c.subCategories.join(", ")}`).join("\n");
const parseJsonResponse = (text) => {
    if (!text)
        throw new Error("Empty AI response");
    const trimmed = text.trim();
    try {
        return JSON.parse(trimmed);
    }
    catch (_a) {
        const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match)
            return JSON.parse(match[0]);
        throw new Error("AI returned invalid JSON");
    }
};
const callGemini = (_a) => __awaiter(void 0, [_a], void 0, function* ({ prompt, imageBase64, mimeType }) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const GEMINI_API_KEY = getGeminiApiKey();
    const GEMINI_MODEL = getGeminiModel();
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    const parts = [{ text: prompt }];
    if (imageBase64) {
        parts.push({
            inline_data: {
                mime_type: mimeType || "image/jpeg",
                data: imageBase64,
            },
        });
    }
    const res = yield fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
                temperature: 0.4,
                responseMimeType: "application/json",
            },
        }),
    });
    if (!res.ok) {
        const errBody = yield res.text();
        console.error("Gemini API error:", res.status, errBody);
        throw new Error("AI service temporarily unavailable.");
    }
    const data = yield res.json();
    const text = ((_f = (_e = (_d = (_c = (_b = data === null || data === void 0 ? void 0 : data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) ||
        ((_k = (_j = (_h = (_g = data === null || data === void 0 ? void 0 : data.candidates) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.content) === null || _j === void 0 ? void 0 : _j.parts) === null || _k === void 0 ? void 0 : _k.map((p) => p.text).join(""));
    return parseJsonResponse(text);
});
const analyzeProductImage = (imageBuffer, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    const base64 = imageBuffer.toString("base64");
    return callGemini({
        prompt: `You are a UK second-hand marketplace listing assistant for Angelpage (charity-linked resale).
Analyze this product image and return JSON only:
{
  "title": "concise marketplace title max 80 chars",
  "brand": "brand or empty string",
  "color": "primary colour",
  "material": "material if visible",
  "condition": "one of: New with tags, Like new, Good, Fair, Well worn",
  "category": "must be one category name from this list: ${productCategories_js_1.PRODUCT_CATEGORIES.map((c) => c.name).join(", ")}",
  "subcategory": "must match a subcategory under the chosen category",
  "size": "size if clothing/shoes else empty",
  "additionalInfo": "2-4 sentence buyer-friendly description highlighting features, style, and charity resale appeal",
  "searchKeywords": ["5-8 search terms buyers might use"]
}
Pick the closest category/subcategory from:
${categoryListText()}`,
        imageBase64: base64,
        mimeType,
    });
});
exports.analyzeProductImage = analyzeProductImage;
const enhanceListing = (fields) => __awaiter(void 0, void 0, void 0, function* () {
    return callGemini({
        prompt: `Improve this UK marketplace listing for Angelpage charity resale. Return JSON only:
{
  "suggestedTitle": "SEO-friendly title max 80 chars",
  "suggestedDescription": "compelling 2-5 sentence description",
  "brand": "suggested brand or keep existing",
  "color": "suggested colour",
  "material": "suggested material",
  "category": "from allowed categories",
  "subcategory": "matching subcategory",
  "searchKeywords": ["relevant keywords"]
}
Allowed categories:
${categoryListText()}

Current listing:
${JSON.stringify(fields, null, 2)}`,
    });
});
exports.enhanceListing = enhanceListing;
const enhanceBlogSeo = (fields) => __awaiter(void 0, void 0, void 0, function* () {
    return callGemini({
        prompt: `You are an SEO copywriter for Angelpage, a UK charity-linked marketplace blog.
Return JSON only:
{
  "title": "engaging article title max 70 chars",
  "metaTitle": "SEO title max 60 chars with primary keyword",
  "metaDescription": "meta description 140-160 chars",
  "excerpt": "compelling excerpt 1-2 sentences for cards",
  "content": "article body 3-6 paragraphs plain text or light HTML <p> tags, UK English, charity/sustainability tone",
  "category": "one of: ${productCategories_js_1.BLOG_CATEGORIES.join(", ")}",
  "tags": ["6-10 lowercase SEO tags as pills"],
  "keywords": ["5-8 SEO keywords"],
  "slugSuggestion": "url-friendly-slug"
}
Input:
${JSON.stringify(fields, null, 2)}`,
    });
});
exports.enhanceBlogSeo = enhanceBlogSeo;
const suggestEvent = (fields) => __awaiter(void 0, void 0, void 0, function* () {
    return callGemini({
        prompt: `You are a community events copywriter for Angelpage charity platform (UK).
Return JSON only:
{
  "title": "compelling event title max 80 chars",
  "excerpt": "short hook 1-2 sentences for listings",
  "description": "full description 3-5 paragraphs, warm and actionable",
  "category": "one of: ${productCategories_js_1.EVENT_CATEGORIES.join(", ")}",
  "eventType": "one of: ${productCategories_js_1.EVENT_TYPES.join(", ")}",
  "topic": "one-line topic/theme",
  "pollQuestion": "optional poll question or empty string",
  "pollOptions": ["3-5 poll options if pollQuestion set, else empty array"],
  "keywords": ["5-8 discovery keywords"]
}
Context:
${JSON.stringify(fields, null, 2)}`,
    });
});
exports.suggestEvent = suggestEvent;
const buildProductSearchQuery = (terms) => {
    const unique = [...new Set(terms.filter(Boolean).map((t) => String(t).trim()))];
    if (!unique.length)
        return null;
    const orClauses = [];
    for (const term of unique.slice(0, 12)) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orClauses.push({ name: { $regex: escaped, $options: "i" } }, { brand: { $regex: escaped, $options: "i" } }, { category: { $regex: escaped, $options: "i" } }, { subcategory: { $regex: escaped, $options: "i" } }, { additionalInfo: { $regex: escaped, $options: "i" } });
    }
    return { status: "LIVE", $or: orClauses };
};
const smartProductSearch = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const expansion = yield callGemini({
        prompt: `Expand this product search query for a UK fashion/resale marketplace.
Return JSON only: { "searchTerms": ["original query plus synonyms, brands, categories, typo fixes, max 10 terms"], "intent": "brief intent" }
Query: "${query}"`,
    });
    const terms = [
        query,
        ...(expansion.searchTerms || []),
        ...(expansion.keywords || []),
    ];
    const mongoQuery = buildProductSearchQuery(terms);
    if (!mongoQuery)
        return { intent: expansion.intent, products: [] };
    const products = yield Product_model_1.default.find(mongoQuery)
        .select("name brand category subcategory price images condition")
        .limit(20)
        .lean();
    return {
        intent: expansion.intent || "product search",
        searchTerms: terms.slice(0, 10),
        products,
    };
});
exports.smartProductSearch = smartProductSearch;
const searchProductsByImage = (imageBuffer, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    const analysis = yield (0, exports.analyzeProductImage)(imageBuffer, mimeType);
    const terms = [
        analysis.title,
        analysis.brand,
        analysis.color,
        analysis.category,
        analysis.subcategory,
        ...(analysis.searchKeywords || []),
    ].filter(Boolean);
    const mongoQuery = buildProductSearchQuery(terms);
    let products = [];
    if (mongoQuery) {
        products = yield Product_model_1.default.find(mongoQuery)
            .select("name brand category subcategory price images condition")
            .limit(16)
            .lean();
    }
    return {
        analysis,
        products,
        searchTerms: terms,
    };
});
exports.searchProductsByImage = searchProductsByImage;
const isGeminiConfigured = () => Boolean(getGeminiApiKey());
exports.isGeminiConfigured = isGeminiConfigured;
