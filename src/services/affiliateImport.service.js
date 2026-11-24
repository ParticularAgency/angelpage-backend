import Product from "../models/Product.model";
import User from "../models/User.model";
import Charity from "../models/Charity.model";
import { CHARITY_SHARE_RATE } from "../constants/platformPolicy.js";
import {
	fetchAffiliateApi,
	mapAffiliateApiResponse,
	appendAffiliateTracking,
} from "./affiliateApiMapper.service.js";
import { fetchEbayCuratedFeed } from "./ebayAffiliate.service.js";
import { buildUniqueProductSlug } from "../utils/productSlug.js";

const MAX_IMPORT = 50;

async function linkProductToOwner(product, ownerId, ownerRole) {
	if (ownerRole === "ADMIN") return;
	const Model = ownerRole === "CHARITY" ? Charity : User;
	await Model.findByIdAndUpdate(ownerId, {
		$addToSet: { listedProducts: product._id },
	});
}

export async function importAffiliateProducts({
	ownerId,
	ownerRole,
	connection,
	products: preloaded,
}) {
	let mapped = preloaded;

	if (!mapped) {
		if (connection.provider === "ebay") {
			const feed = await fetchEbayCuratedFeed({ limit: MAX_IMPORT });
			mapped = feed.map((item) => ({
				externalId: item.ebayItemId,
				name: item.title,
				price: item.price,
				images: item.imageUrl ? [item.imageUrl] : [],
				affiliateUrl: item.itemWebUrl,
				category: "affiliate",
				checkoutMode: "affiliate_redirect",
				source: "ebay_affiliate",
			}));
		} else {
			const raw = await fetchAffiliateApi({
				apiUrl: connection.apiUrl,
				apiKey: connection.apiKey,
			});
			mapped = mapAffiliateApiResponse(
				raw,
				connection.fieldMapping,
				connection.itemsPath,
			).map((p) => ({
				...p,
				affiliateUrl: appendAffiliateTracking(
					p.affiliateUrl,
					connection.affiliateId,
				),
				checkoutMode: "affiliate_redirect",
				source: "ebay_affiliate",
			}));
		}
	}

	const slice = mapped.slice(0, MAX_IMPORT);
	const imported = [];
	const updated = [];

	for (const item of slice) {
		const price = parseFloat(item.price);
		if (!item.name || !price || price < 1) continue;

		const query = {
			seller: ownerId,
			$or: [
				{ ebayItemId: item.externalId },
				{ externalProductId: item.externalId },
				{ affiliateUrl: item.affiliateUrl },
			],
		};

		let product = await Product.findOne(query);
		const payload = {
			name: item.name,
			price,
			charityProfit: Math.round(price * CHARITY_SHARE_RATE * 100) / 100,
			category: item.category || "affiliate",
			additionalInfo: item.additionalInfo || "",
			images: (item.images || []).slice(0, 10).map((url) => ({
				url: String(url),
				altText: item.name,
			})),
			quantity: 1,
			stockRemaining: 1,
			seller: ownerId,
			charity: ownerRole === "CHARITY" ? ownerId : item.charityId,
			source: item.source || "ebay_affiliate",
			checkoutMode: item.checkoutMode || "affiliate_redirect",
			ebayItemId: item.externalId,
			ebayAffiliateUrl: item.affiliateUrl,
			affiliateUrl: item.affiliateUrl,
			affiliatePartnerId: connection?.affiliateId || "",
			externalProductId: item.externalId,
			status: "LIVE",
			isArchived: false,
		};

		if (!product) {
			payload.slug = await buildUniqueProductSlug(item.name);
			product = new Product(payload);
			await product.save();
			await linkProductToOwner(product, ownerId, ownerRole);
			imported.push(product);
		} else {
			const nameChanged = item.name && item.name !== product.name;
			Object.assign(product, payload);
			if (nameChanged) {
				product.slug = await buildUniqueProductSlug(item.name, product._id);
			}
			await product.save();
			updated.push(product);
		}
	}

	return { importedCount: imported.length, updatedCount: updated.length, imported, updated };
}

export async function listAffiliateProducts(ownerId) {
	return Product.find({
		seller: ownerId,
		checkoutMode: { $in: ["ebay_redirect", "affiliate_redirect"] },
		isArchived: false,
	}).sort({ updatedAt: -1 });
}

export async function updateAffiliateProduct(ownerId, productId, updates) {
	const product = await Product.findOne({
		_id: productId,
		seller: ownerId,
		checkoutMode: { $in: ["ebay_redirect", "affiliate_redirect"] },
	});
	if (!product) throw new Error("Affiliate product not found.");

	const allowed = [
		"name",
		"price",
		"additionalInfo",
		"category",
		"affiliateUrl",
		"ebayAffiliateUrl",
	];
	for (const key of allowed) {
		if (updates[key] !== undefined) product[key] = updates[key];
	}
	if (updates.price) {
		product.charityProfit =
			Math.round(parseFloat(updates.price) * CHARITY_SHARE_RATE * 100) / 100;
	}
	await product.save();
	return product;
}

export async function removeAffiliateProduct(ownerId, productId) {
	const product = await Product.findOneAndUpdate(
		{ _id: productId, seller: ownerId },
		{ status: "REMOVED", isArchived: true },
		{ new: true },
	);
	if (!product) throw new Error("Affiliate product not found.");
	return product;
}
