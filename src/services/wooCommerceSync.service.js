import axios from "axios";

function mapWooProduct(p) {
	const price = p.price ? parseFloat(p.price) : parseFloat(p.regular_price);
	const images = (p.images || []).map((img) => img.src).filter(Boolean);

	return {
		source: "woocommerce_sync",
		wooCommerceProductId: String(p.id),
		externalProductId: String(p.id),
		externalProductUrl: p.permalink,
		name: p.name,
		price,
		category: p.categories?.[0]?.name || "general",
		brand: "",
		additionalInfo: p.short_description?.replace(/<[^>]+>/g, " ").slice(0, 500) || "",
		quantity: p.stock_quantity > 0 ? p.stock_quantity : 1,
		images,
	};
}

export async function fetchWooCommerceProducts({
	storeUrl,
	consumerKey,
	consumerSecret,
}) {
	const base = storeUrl.replace(/\/$/, "");

	if (consumerKey && consumerSecret) {
		const res = await axios.get(`${base}/wp-json/wc/v3/products`, {
			params: { per_page: 50, status: "publish", consumer_key: consumerKey, consumer_secret: consumerSecret },
			timeout: 20_000,
		});
		return (res.data || []).map(mapWooProduct).filter((p) => p.price && p.name);
	}

	const res = await axios.get(`${base}/wp-json/wc/store/products`, {
		params: { per_page: 50 },
		timeout: 20_000,
		validateStatus: (s) => s < 500,
	});

	const list = Array.isArray(res.data) ? res.data : res.data?.products || [];
	if (res.status >= 400 || !list.length) {
		throw new Error(
			"WooCommerce API keys are required for this store. Enter Consumer key and Consumer secret.",
		);
	}

	return list
		.map((p) => ({
			source: "woocommerce_sync",
			wooCommerceProductId: String(p.id),
			externalProductId: String(p.id),
			externalProductUrl: p.permalink,
			name: p.name,
			price: parseFloat(p.prices?.price || p.price || 0) / (p.prices?.currency_minor_unit === 2 ? 100 : 1),
			category: p.categories?.[0]?.name || "general",
			images: (p.images || []).map((i) => i.src || i.thumbnail).filter(Boolean),
			quantity: 1,
		}))
		.filter((p) => p.price >= 1 && p.name);
}

export async function testWooCommerceConnection(config) {
	const products = await fetchWooCommerceProducts(config);
	return { ok: true, sampleCount: products.length };
}
