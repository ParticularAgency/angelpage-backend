import express from "express";
import {
	handleEbayWebhook,
	handleShopifyWebhook,
} from "./webhooks.controller.js";

const router = express.Router();

router.post("/ebay", handleEbayWebhook);
// Shopify is mounted with raw body in server.ts for HMAC verification
// router.post("/shopify", handleShopifyWebhook);

export default router;
