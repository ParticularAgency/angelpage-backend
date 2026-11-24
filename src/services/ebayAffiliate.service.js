/**
 * eBay Partner Network / curated item feed integration scaffold.
 * Docs: https://developer.ebay.com/api-docs/buy/marketing/overview.html
 *
 * Requires: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_CAMPAIGN_ID (affiliate)
 */
import fetch from "node-fetch";
import { getValidToken } from "../utils/ebayAuth.js";

const EBAY_ENV = process.env.EBAY_ENV || "PRODUCTION";
const EBAY_API_BASE =
	EBAY_ENV === "PRODUCTION"
		? "https://api.ebay.com"
		: "https://api.sandbox.ebay.com";

const CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID;
const AFFILIATE_REFERENCE_ID = process.env.EBAY_AFFILIATE_REFERENCE_ID || "angelpage";

/**
 * Fetch curated affiliate items (paginated).
 * Returns normalized products for Angelpage catalog display.
 */
export async function fetchEbayCuratedFeed({ limit = 50, offset = 0 } = {}) {
	if (!CAMPAIGN_ID) {
		throw new Error(
			"EBAY_CAMPAIGN_ID is not configured. Sign up for eBay Partner Network first.",
		);
	}

	const token = await getValidToken();
	const url = new URL(`${EBAY_API_BASE}/buy/marketing/v1_beta/merchandised_product`);
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("offset", String(offset));

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${token}`,
			"X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
			"X-EBAY-C-ENDUSERCTX":
				`affiliateCampaignId=${CAMPAIGN_ID},affiliateReferenceId=${AFFILIATE_REFERENCE_ID}`,
		},
	});

	if (!res.ok) {
		const errText = await res.text();
		throw new Error(`eBay feed error ${res.status}: ${errText}`);
	}

	const data = await res.json();
	const items = data.merchandisedProducts || data.items || [];

	return items.map(item => ({
		source: "ebay_affiliate",
		ebayItemId: item.itemId || item.legacyItemId,
		title: item.title,
		price: item.price?.value ? parseFloat(item.price.value) : null,
		currency: item.price?.currency || "GBP",
		imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl,
		itemWebUrl: item.itemAffiliateWebUrl || item.itemWebUrl,
		condition: item.condition,
		charityProfit: null,
		checkoutMode: "ebay_redirect",
	}));
}
