"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webhooks_controller_js_1 = require("./webhooks.controller.js");
const router = express_1.default.Router();
router.post("/ebay", webhooks_controller_js_1.handleEbayWebhook);
router.post("/shopify", webhooks_controller_js_1.handleShopifyWebhook);
exports.default = router;
