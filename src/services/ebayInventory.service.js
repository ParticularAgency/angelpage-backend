/**
 * eBay inventory sync — delist / end item when sold on Angelpage.
 * Requires EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, seller OAuth scopes for sell.inventory
 */
import { getValidToken } from "../utils/ebayAuth.js";
import Product from "../models/Product.model";

const EBAY_API_BASE =
	process.env.EBAY_ENV === "PRODUCTION"
		? "https://api.ebay.com"
		: "https://api.sandbox.ebay.com";

export async function endEbayListingForProduct(productId) {
	const product = await Product.findById(productId).select(
		"ebayItemId ebayOfferId source name",
	);
	if (!product?.ebayItemId || product.source !== "ebay_sync") {
		return { skipped: true, reason: "Not an eBay-synced listing" };
	}

	const token = await getValidToken();
	const offerId = product.ebayOfferId;

	if (offerId) {
		const res = await fetch(
			`${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/withdraw`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
			},
		);
		if (!res.ok) {
			const err = await res.text();
			console.error("eBay withdraw failed:", err);
			return { success: false, error: err };
		}
	}

	product.status = "REMOVED";
	product.isArchived = true;
	product.stockRemaining = 0;
	await product.save();

	return { success: true, productId: product._id };
}

export async function syncStockAfterAngelpageSale(productIds = []) {
	const results = [];
	for (const id of productIds) {
		try {
			results.push(await endEbayListingForProduct(id));
		} catch (err) {
			results.push({ productId: id, success: false, error: err.message });
		}
	}
	return results;
}
