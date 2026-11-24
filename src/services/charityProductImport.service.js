import Product from "../models/Product.model";
import Charity from "../models/Charity.model";
import { CHARITY_SHARE_RATE } from "../constants/platformPolicy.js";
import { buildUniqueProductSlug } from "../utils/productSlug.js";

const MAX_SYNC_PRODUCTS = 50;

/**
 * Normalize external catalog item → Mongo Product fields.
 */
export function normalizeExternalProduct(item, charity) {
	const price = parseFloat(item.price);
	if (!price || Number.isNaN(price) || price < 1) {
		return null;
	}

	const images = (item.images || [])
		.filter(Boolean)
		.slice(0, 10)
		.map((url) => ({ url: String(url), altText: item.name || "" }));

	return {
		name: String(item.name || "Imported product").slice(0, 200),
		price,
		charityProfit: Math.round(price * CHARITY_SHARE_RATE * 100) / 100,
		category: item.category || "general",
		subcategory: item.subcategory || "",
		condition: item.condition || "Good",
		brand: item.brand || "",
		additionalInfo: item.additionalInfo || item.description || "",
		quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
		images,
		source: item.source,
		shopifyProductId: item.shopifyProductId || undefined,
		wooCommerceProductId: item.wooCommerceProductId || undefined,
		ebayItemId: item.ebayItemId || undefined,
		ebayAffiliateUrl: item.ebayAffiliateUrl || undefined,
		externalProductUrl: item.externalProductUrl || undefined,
		externalProductId: item.externalProductId || undefined,
		checkoutMode: item.checkoutMode || "stripe",
		charity: charity._id,
		seller: charity._id,
		selectedCharityId: String(charity._id),
		selectedCharityName: charity.charityName || "",
		selectCharityName: charity.charityName || "",
	};
}

export async function upsertImportedProducts(charityId, items, { autoPublish = true } = {}) {
	const charity = await Charity.findById(charityId);
	if (!charity) {
		throw new Error("Charity not found");
	}

	const slice = items.slice(0, MAX_SYNC_PRODUCTS);
	const imported = [];
	const updated = [];
	const skipped = [];

	for (const raw of slice) {
		const normalized = normalizeExternalProduct(raw, charity);
		if (!normalized) {
			skipped.push({ name: raw?.name, reason: "Invalid price or name" });
			continue;
		}

		const orConditions = [];
		if (normalized.shopifyProductId) {
			orConditions.push({ shopifyProductId: normalized.shopifyProductId });
		}
		if (normalized.wooCommerceProductId) {
			orConditions.push({ wooCommerceProductId: normalized.wooCommerceProductId });
		}
		if (normalized.ebayItemId) {
			orConditions.push({ ebayItemId: normalized.ebayItemId });
		}
		if (normalized.externalProductId) {
			orConditions.push({
				externalProductId: normalized.externalProductId,
				source: normalized.source,
			});
		}
		if (normalized.externalProductUrl) {
			orConditions.push({ externalProductUrl: normalized.externalProductUrl });
		}

		let product =
			orConditions.length > 0
				? await Product.findOne({ charity: charity._id, $or: orConditions })
				: null;

		const status = autoPublish ? "LIVE" : "PENDING_REVIEW";
		const stock = normalized.quantity;

		if (!product) {
			product = new Product({
				...normalized,
				slug: await buildUniqueProductSlug(normalized.name),
				stockRemaining: stock,
				status,
				isArchived: false,
			});
			await product.save();
			await Charity.findByIdAndUpdate(charity._id, {
				$addToSet: { listedProducts: product._id },
			});
			imported.push(product);
		} else {
			const nameChanged = normalized.name && normalized.name !== product.name;
			Object.assign(product, {
				name: normalized.name,
				price: normalized.price,
				charityProfit: normalized.charityProfit,
				category: normalized.category,
				subcategory: normalized.subcategory,
				condition: normalized.condition,
				brand: normalized.brand,
				additionalInfo: normalized.additionalInfo,
				images: normalized.images.length ? normalized.images : product.images,
				quantity: stock,
				stockRemaining: stock,
				source: normalized.source,
				externalProductUrl: normalized.externalProductUrl,
				status: product.status === "REMOVED" ? status : product.status,
				isArchived: false,
			});
			if (nameChanged) {
				product.slug = await buildUniqueProductSlug(normalized.name, product._id);
			}
			await product.save();
			updated.push(product);
		}
	}

	return {
		importedCount: imported.length,
		updatedCount: updated.length,
		skippedCount: skipped.length,
		skipped,
		totalListed: await Product.countDocuments({
			charity: charity._id,
			status: { $in: ["LIVE", "PENDING_REVIEW"] },
			isArchived: false,
		}),
	};
}
