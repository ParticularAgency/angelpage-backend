import axios from "axios";

export function getByPath(obj, path) {
	if (!path) return obj;
	return String(path)
		.split(".")
		.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function mapAffiliateApiResponse(raw, mapping = {}, itemsPath = "products") {
	const defaults = {
		title: "title",
		price: "price",
		image: "image",
		description: "description",
		url: "url",
		id: "id",
		...mapping,
	};

	let items = getByPath(raw, itemsPath);
	if (!Array.isArray(items)) {
		if (Array.isArray(raw)) items = raw;
		else if (raw?.items) items = raw.items;
		else if (raw?.data && Array.isArray(raw.data)) items = raw.data;
		else items = [];
	}

	return items
		.map((item) => {
			const title =
				getByPath(item, defaults.title) || item.name || item.product_title;
			const priceRaw =
				getByPath(item, defaults.price) ??
				item.price?.value ??
				item.variants?.[0]?.price;
			const price = parseFloat(String(priceRaw).replace(/[^\d.]/g, ""));
			const image =
				getByPath(item, defaults.image) ||
				item.image?.url ||
				item.images?.[0]?.src ||
				item.thumbnailImages?.[0]?.imageUrl;
			const url =
				getByPath(item, defaults.url) ||
				item.itemWebUrl ||
				item.permalink ||
				item.link;
			const id =
				getByPath(item, defaults.id) ||
				item.itemId ||
				item.legacyItemId ||
				item.sku;
			const description =
				getByPath(item, defaults.description) ||
				item.body_html ||
				item.short_description ||
				"";

			if (!title || !price || Number.isNaN(price)) return null;

			return {
				externalId: String(id || title),
				name: String(title).slice(0, 200),
				price,
				images: image ? [image] : [],
				additionalInfo: String(description).replace(/<[^>]+>/g, " ").slice(0, 500),
				affiliateUrl: url,
				category: item.category || item.product_type || "affiliate",
			};
		})
		.filter(Boolean);
}

export async function fetchAffiliateApi({ apiUrl, apiKey, headers = {} }) {
	const config = {
		method: "GET",
		url: apiUrl,
		timeout: 25000,
		headers: { Accept: "application/json", ...headers },
	};
	if (apiKey) {
		config.headers.Authorization = `Bearer ${apiKey}`;
		config.headers["X-API-Key"] = apiKey;
	}
	const res = await axios(config);
	return res.data;
}

export function appendAffiliateTracking(url, affiliateId) {
	if (!url || !affiliateId) return url;
	try {
		const u = new URL(url);
		u.searchParams.set("affiliate_id", affiliateId);
		u.searchParams.set("utm_source", "angelpage");
		u.searchParams.set("utm_medium", "affiliate");
		return u.toString();
	} catch {
		return url;
	}
}
