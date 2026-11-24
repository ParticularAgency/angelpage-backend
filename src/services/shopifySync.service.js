import axios from "axios";
import Product from "../models/Product.model";

function shopifyBase(storeUrl, shopifyDomain) {
	if (shopifyDomain) {
		return `https://${shopifyDomain}`;
	}
	return storeUrl.replace(/\/$/, "");
}

function mapShopifyProduct(p) {
	const variant = p.variants?.[0];
	const price = variant?.price ? parseFloat(variant.price) : null;
	const images = (p.images || []).map((img) => img.src).filter(Boolean);

	return {
		source: "shopify_sync",
		shopifyProductId: String(p.id),
		externalProductId: String(p.id),
		externalProductUrl: p.handle ? undefined : undefined,
		name: p.title,
		price,
		category: p.product_type || "general",
		brand: p.vendor || "",
		additionalInfo: p.body_html?.replace(/<[^>]+>/g, " ").slice(0, 500) || "",
		quantity: variant?.inventory_quantity > 0 ? variant.inventory_quantity : 1,
		images,
	};
}

/**
 * Fetch products from Shopify Admin API or public products.json.
 */
export async function fetchShopifyProducts({ storeUrl, shopifyDomain, accessToken }) {
	const base = shopifyBase(storeUrl, shopifyDomain);

	if (accessToken) {
		const adminHost = shopifyDomain || new URL(storeUrl).hostname;
		const adminBase = adminHost.includes("myshopify.com")
			? `https://${adminHost}`
			: `https://${adminHost}`;

		const res = await axios.get(
			`${adminBase}/admin/api/2024-01/products.json?limit=50&status=active`,
			{
				headers: {
					"X-Shopify-Access-Token": accessToken,
					"Content-Type": "application/json",
				},
				timeout: 20_000,
			},
		);

		return (res.data?.products || [])
			.map((p) => ({
				...mapShopifyProduct(p),
				externalProductUrl: p.handle ? `${base}/products/${p.handle}` : undefined,
			}))
			.filter((p) => p.price && p.name);
	}

	const res = await axios.get(`${base}/products.json?limit=50`, {
		timeout: 20_000,
		validateStatus: (s) => s < 500,
	});

	if (res.status >= 400 || !res.data?.products?.length) {
		throw new Error(
			"Could not read Shopify products. Add an Admin API access token for private stores.",
		);
	}

	return res.data.products
		.map((p) => ({
			...mapShopifyProduct(p),
			externalProductUrl: p.handle ? `${base}/products/${p.handle}` : undefined,
		}))
		.filter((p) => p.price && p.name);
}

export async function testShopifyConnection(config) {
	const products = await fetchShopifyProducts(config);
	return { ok: true, sampleCount: products.length };
}

export async function delistShopifyProductOnSale(productId) {
	const product = await Product.findById(productId);
	if (!product?.shopifyProductId || product.source !== "shopify_sync") {
		return { skipped: true };
	}
	product.stockRemaining = 0;
	product.status = "REMOVED";
	await product.save();
	return { success: true };
}
