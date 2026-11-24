import axios from "axios";

const FETCH_TIMEOUT = 12_000;

function normalizeUrl(input) {
	if (!input?.trim()) return null;
	let url = input.trim();
	if (!/^https?:\/\//i.test(url)) {
		url = `https://${url}`;
	}
	try {
		const parsed = new URL(url);
		return parsed.origin;
	} catch {
		return null;
	}
}

async function fetchSite(origin) {
	const res = await axios.get(origin, {
		timeout: FETCH_TIMEOUT,
		maxRedirects: 5,
		validateStatus: (s) => s < 500,
		headers: {
			"User-Agent": "AngelpageBot/1.0 (+https://angelpage.co.uk)",
			Accept: "text/html,application/json",
		},
	});
	return { status: res.status, html: String(res.data || ""), headers: res.headers };
}

async function probeJson(url) {
	try {
		const res = await axios.get(url, {
			timeout: FETCH_TIMEOUT,
			validateStatus: (s) => s < 500,
		});
		if (res.status >= 400) return null;
		return res.data;
	} catch {
		return null;
	}
}

/**
 * Detect e-commerce platform from store URL.
 * @returns {Promise<{ platform, storeUrl, shopifyDomain?, canUsePublicApi, canScrape, requiredFields, message }>}
 */
export async function detectStorePlatform(storeUrlInput) {
	const storeUrl = normalizeUrl(storeUrlInput);
	if (!storeUrl) {
		throw new Error("Please enter a valid website URL.");
	}

	const host = new URL(storeUrl).hostname.toLowerCase();
	let platform = "unknown";
	let shopifyDomain = null;
	let canUsePublicApi = false;
	let canScrape = false;
	let message = "";

	if (host.includes("myshopify.com")) {
		platform = "shopify";
		shopifyDomain = host;
		canUsePublicApi = true;
		message = "Shopify store detected. You can sync via API key or public catalog.";
	} else {
		const { status, html, headers } = await fetchSite(storeUrl);
		if (status >= 400) {
			throw new Error("Could not reach that website. Check the URL and try again.");
		}

		const lower = html.toLowerCase();
		const poweredBy = String(headers["x-shopify-stage"] || headers["x-shopid"] || "");

		if (
			lower.includes("cdn.shopify.com") ||
			lower.includes("shopify.theme") ||
			lower.includes("myshopify.com") ||
			poweredBy
		) {
			platform = "shopify";
			canUsePublicApi = true;
			message = "Shopify storefront detected.";
		} else if (
			lower.includes("woocommerce") ||
			lower.includes("wp-content/plugins/woocommerce") ||
			lower.includes("/wp-json/wc/")
		) {
			platform = "woocommerce";
			message = "WooCommerce / WordPress store detected. API keys are required.";
		} else if (lower.includes("wp-content") || lower.includes("wordpress")) {
			platform = "wordpress";
			message =
				"WordPress site detected. WooCommerce API keys may be required for products.";
		}

		canScrape =
			lower.includes('type":"product"') ||
			lower.includes("product-item") ||
			lower.includes("woocommerce-loop") ||
			lower.includes("grid-product") ||
			html.includes("@type\":\"Product\"");
	}

	if (platform === "shopify") {
		const productsJson = await probeJson(`${storeUrl}/products.json?limit=1`);
		if (productsJson?.products?.length) {
			canUsePublicApi = true;
		}
	}

	if (platform === "woocommerce") {
		const wcProbe = await probeJson(`${storeUrl}/wp-json/wc/store/products?per_page=1`);
		if (wcProbe?.length || wcProbe?.products?.length) {
			canUsePublicApi = true;
			message += " Public WooCommerce store API is available.";
		}
	}

	if (platform === "unknown") {
		const productsJson = await probeJson(`${storeUrl}/products.json?limit=1`);
		if (productsJson?.products?.length) {
			platform = "shopify";
			canUsePublicApi = true;
			message = "Shopify-style product feed found at /products.json.";
		} else if (canScrape) {
			platform = "scrape";
			message =
				"No known API detected. Angelpage can try to import products by reading your shop pages.";
		} else {
			throw new Error(
				"Sorry, the website is not able to be scraped. Try entering a Shopify or WooCommerce API key, or add products manually.",
			);
		}
	}

	const requiredFields =
		platform === "shopify"
			? ["apiKeyOptional"]
			: platform === "woocommerce"
				? ["apiKey", "apiSecret"]
				: platform === "scrape"
					? []
					: ["apiKeyOptional"];

	return {
		platform,
		storeUrl,
		shopifyDomain,
		canUsePublicApi,
		canScrape,
		requiredFields,
		message:
			message ||
			"Store detected. Connect with an API key or sync automatically where supported.",
	};
}
