import crypto from "crypto";

/**
 * Inbound webhook handlers.
 * Stripe is mounted separately with raw body in server.ts.
 * Shopify HMAC verified here (raw Buffer body when mounted with express.raw).
 * eBay: reject unless signature verification is configured.
 */

function timingSafeEqualString(a, b) {
	const bufA = Buffer.from(a || "", "utf8");
	const bufB = Buffer.from(b || "", "utf8");
	if (bufA.length !== bufB.length) return false;
	return crypto.timingSafeEqual(bufA, bufB);
}

function getRawBody(req) {
	if (Buffer.isBuffer(req.body)) return req.body;
	if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
	return Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
}

/**
 * Verify Shopify webhook HMAC (X-Shopify-Hmac-Sha256).
 * Requires raw body middleware when mounting this route.
 */
export function verifyShopifyHmac(req) {
	const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
	if (!secret) {
		return { ok: false, status: 503, message: "SHOPIFY_WEBHOOK_SECRET is not configured" };
	}
	const hmacHeader = req.headers["x-shopify-hmac-sha256"];
	if (!hmacHeader || typeof hmacHeader !== "string") {
		return { ok: false, status: 401, message: "Missing X-Shopify-Hmac-Sha256" };
	}
	const digest = crypto
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
export function verifyEbayNotification(req) {
	const token = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN;
	if (!token) {
		return {
			ok: false,
			status: 503,
			message:
				"EBAY_WEBHOOK_VERIFICATION_TOKEN is not configured — rejecting unsigned eBay webhooks",
		};
	}

	const challenge = req.query?.challenge_code || req.body?.challengeCode;
	if (challenge && req.method === "GET") {
		return { ok: true, challenge };
	}

	const provided =
		req.headers["x-ebay-verification-token"] ||
		req.headers["x-ebay-signature"] ||
		req.query?.verification_token;

	if (!provided || !timingSafeEqualString(String(provided), token)) {
		return { ok: false, status: 401, message: "Invalid or missing eBay verification token" };
	}
	return { ok: true };
}

export const handleEbayWebhook = async (req, res) => {
	const verification = verifyEbayNotification(req);
	if (!verification.ok) {
		return res.status(verification.status).json({ message: verification.message });
	}

	const topic = req.headers["x-ebay-notification-topic"] || "unknown";
	console.log("[webhook] eBay verified:", topic);

	// Inventory / order sync via ebayInventory.service.js when ready
	res.status(200).json({ received: true, source: "ebay" });
};

export const handleShopifyWebhook = async (req, res) => {
	const verification = verifyShopifyHmac(req);
	if (!verification.ok) {
		return res.status(verification.status).json({ message: verification.message });
	}

	const topic = req.headers["x-shopify-topic"] || "unknown";
	console.log("[webhook] Shopify verified:", topic);

	// products/update, inventory_levels/update → shopifySync.service.js when ready
	res.status(200).json({ received: true, source: "shopify" });
};
