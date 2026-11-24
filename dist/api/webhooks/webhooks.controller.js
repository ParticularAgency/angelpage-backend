"use strict";
/**
 * Inbound webhook handlers (scaffold).
 * eBay/Shopify: verify signatures and sync inventory when implemented.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleShopifyWebhook = exports.handleEbayWebhook = void 0;
const handleEbayWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const topic = req.headers["x-ebay-notification-topic"] || "unknown";
    console.log("[webhook] eBay:", topic, ((_a = req.body) === null || _a === void 0 ? void 0 : _a.notificationId) || "");
    // TODO: verify eBay notification signature
    // TODO: inventory / order status sync via ebayInventory.service.js
    res.status(200).json({ received: true, source: "ebay" });
});
exports.handleEbayWebhook = handleEbayWebhook;
const handleShopifyWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const topic = req.headers["x-shopify-topic"] || "unknown";
    console.log("[webhook] Shopify:", topic);
    // TODO: verify HMAC (requires raw body middleware)
    // TODO: products/update, inventory_levels/update → shopifySync.service.js
    res.status(200).json({ received: true, source: "shopify" });
});
exports.handleShopifyWebhook = handleShopifyWebhook;
