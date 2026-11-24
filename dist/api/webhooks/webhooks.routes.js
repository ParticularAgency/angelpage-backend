"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webhooks_controller_js_1 = require("./webhooks.controller.js");
const router = express_1.default.Router();
router.post("/ebay", webhooks_controller_js_1.handleEbayWebhook);
// Shopify is mounted with raw body in server.ts for HMAC verification
// router.post("/shopify", handleShopifyWebhook);
exports.default = router;
