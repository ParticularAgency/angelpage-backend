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
exports.handleShopifyWebhook = exports.handleEbayWebhook = void 0;
exports.verifyShopifyHmac = verifyShopifyHmac;
exports.verifyEbayNotification = verifyEbayNotification;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Inbound webhook handlers.
 * Stripe is mounted separately with raw body in server.ts.
 * Shopify HMAC verified here (raw Buffer body when mounted with express.raw).
 * eBay: reject unless signature verification is configured.
 */
function timingSafeEqualString(a, b) {
    const bufA = Buffer.from(a || "", "utf8");
    const bufB = Buffer.from(b || "", "utf8");
    if (bufA.length !== bufB.length)
        return false;
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
function getRawBody(req) {
    var _a;
    if (Buffer.isBuffer(req.body))
        return req.body;
    if (typeof req.body === "string")
        return Buffer.from(req.body, "utf8");
    return Buffer.from(JSON.stringify((_a = req.body) !== null && _a !== void 0 ? _a : {}), "utf8");
}
/**
 * Verify Shopify webhook HMAC (X-Shopify-Hmac-Sha256).
 * Requires raw body middleware when mounting this route.
 */
function verifyShopifyHmac(req) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
        return { ok: false, status: 503, message: "SHOPIFY_WEBHOOK_SECRET is not configured" };
    }
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    if (!hmacHeader || typeof hmacHeader !== "string") {
        return { ok: false, status: 401, message: "Missing X-Shopify-Hmac-Sha256" };
    }
    const digest = crypto_1.default
        .createHmac("sha256", secret)
        .update(getRawBody(req))
        .digest("base64");
    if (!timingSafeEqualString(digest, hmacHeader)) {
        return { ok: false, status: 401, message: "Invalid Shopify webhook signature" };
    }
    return { ok: true };
}
/**
 * eBay notification verification scaffold.
 * When EBAY_WEBHOOK_VERIFICATION_TOKEN is set, require matching token header/query.
 * Full ECDSA signature verification can be added when Notification API keys are configured.
 */
function verifyEbayNotification(req) {
    var _a, _b, _c;
    const token = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN;
    if (!token) {
        return {
            ok: false,
            status: 503,
            message: "EBAY_WEBHOOK_VERIFICATION_TOKEN is not configured — rejecting unsigned eBay webhooks",
        };
    }
    const challenge = ((_a = req.query) === null || _a === void 0 ? void 0 : _a.challenge_code) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.challengeCode);
    if (challenge && req.method === "GET") {
        return { ok: true, challenge };
    }
    const provided = req.headers["x-ebay-verification-token"] ||
        req.headers["x-ebay-signature"] ||
        ((_c = req.query) === null || _c === void 0 ? void 0 : _c.verification_token);
    if (!provided || !timingSafeEqualString(String(provided), token)) {
        return { ok: false, status: 401, message: "Invalid or missing eBay verification token" };
    }
    return { ok: true };
}
const handleEbayWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const verification = verifyEbayNotification(req);
    if (!verification.ok) {
        return res.status(verification.status).json({ message: verification.message });
    }
    const topic = req.headers["x-ebay-notification-topic"] || "unknown";
    console.log("[webhook] eBay verified:", topic);
    // Inventory / order sync via ebayInventory.service.js when ready
    res.status(200).json({ received: true, source: "ebay" });
});
exports.handleEbayWebhook = handleEbayWebhook;
const handleShopifyWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const verification = verifyShopifyHmac(req);
    if (!verification.ok) {
        return res.status(verification.status).json({ message: verification.message });
    }
    const topic = req.headers["x-shopify-topic"] || "unknown";
    console.log("[webhook] Shopify verified:", topic);
    // products/update, inventory_levels/update → shopifySync.service.js when ready
    res.status(200).json({ received: true, source: "shopify" });
});
exports.handleShopifyWebhook = handleShopifyWebhook;
