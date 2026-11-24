// import { Request, Response } from "express";
import Product from "../../models/Product.model";
import { resolveCharityId, isCharityAccountRole } from "../../utils/charityAccess.js";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import { parseSocialPostingInput } from "../../services/socialPosting.service.js";
import { queueAutoPostNewListing } from "../../api/social/socialPosts.controller.js";
import { getReviewSummaryForProduct, isAdminUser } from "./productReviews.controller.js";
import {
	fireMarketingEvent,
	JOURNEY_EVENTS,
} from "../../services/marketingJourneys.service.js";
import { notifyCharityNewListing } from "../../utils/notifyCharity";
import cloudinary from "../../config/cloudinary";
import {
	buildUniqueProductSlug,
	resolveProductLookup,
} from "../../utils/productSlug.js";
import { calculateProfitSplit } from "../../utils/profitSplit.js";

const parseSellAreas = (raw) => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
		} catch {
			/* comma-separated */
		}
		return raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
};

const parseFulfillmentType = (value) => {
	const allowed = ["uk_shipping", "personal_delivery", "self_collect", "local_only"];
	return allowed.includes(value) ? value : "uk_shipping";
};

// Create a new product
export const createProduct = async (req, res) => {
	const {
		name,
		price,
		charityProfit,
		category,
		charity,
		additionalInfo,
		subcategory,
		condition,
		brand,
		material,
		color,
		size,
		weight,
		dimensions,
		selectedCharityName,
		selectedCharityId,
		status,
		quantity,
		socialPosting,
		sellerSharePercent,
		fulfillmentType,
		sellAreas,
	} = req.body;

	const { userId, role } = req.user;

	try {
		if (!name || !price || !category) {
			return res
				.status(400)
				.json({ message: "Name, price, and category are required." });
		}
		// Parse dimensions if it's a string
		let parsedDimensions = null;
		if (dimensions) {
			if (typeof dimensions === "string") {
				try {
					parsedDimensions = JSON.parse(dimensions);
				} catch (err) {
					return res.status(400).json({
						message:
							"Invalid dimensions format. It must be a valid JSON object.",
					});
				}
			} else if (typeof dimensions === "object") {
				parsedDimensions = dimensions;
			} else {
				return res.status(400).json({
					message:
						"Invalid dimensions format. It must be an object or a JSON string.",
				});
			}
		}
		// Handle file uploads (images + optional videos)
		const images = [];
		const videos = [];
		const imageFiles = req.files?.images
			? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
			: Array.isArray(req.files)
				? req.files
				: [];
		const videoFiles = req.files?.videos
			? (Array.isArray(req.files.videos) ? req.files.videos : [req.files.videos])
			: [];

		for (const file of imageFiles) {
			const result = await cloudinary.uploader.upload(file.path, {
				folder: "products",
			});
			images.push({ url: result.secure_url, altText: name || "" });
		}
		for (const file of videoFiles) {
			const result = await cloudinary.uploader.upload(file.path, {
				folder: "products/videos",
				resource_type: "video",
			});
			videos.push({ url: result.secure_url, altText: name || "" });
		}

		// Determine the charity association based on the role
		let charityId = null;
		if (role === "USER") {
			if (!charity && status !== "DRAFT") {
				return res
					.status(400)
					.json({ message: "Charity is required for USER role." });
			}
			charityId = charity || null;
		} else if (role === "CHARITY") {
			charityId = userId;
		}

		const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

		const requestedStatus = status || "DRAFT";
		let finalStatus = requestedStatus;
		if (requestedStatus === "LIVE") {
			finalStatus = "PENDING_REVIEW";
		}

		const slug = await buildUniqueProductSlug(name);

		const numericPrice = parseFloat(price);
		const sharePct = Math.min(
			100,
			Math.max(0, parseFloat(sellerSharePercent) || 0),
		);
		const split = calculateProfitSplit(numericPrice, sharePct);
		const resolvedFulfillment = parseFulfillmentType(fulfillmentType);
		const resolvedAreas = parseSellAreas(sellAreas);

		if (resolvedFulfillment === "local_only" && resolvedAreas.length === 0) {
			return res.status(400).json({
				message: "Add at least one area for local-only listings.",
			});
		}

		if (
			resolvedFulfillment === "uk_shipping" &&
			finalStatus !== "DRAFT" &&
			(!weight || !parsedDimensions?.height || !parsedDimensions?.width)
		) {
			return res.status(400).json({
				message:
					"Weight and package dimensions are required for UK shipping listings.",
			});
		}

		// Create a new product
		const newProduct = new Product({
			name,
			slug,
			price,
			charityProfit: split.charityProfit,
			sellerSharePercent: sharePct,
			sellerProfit: split.sellerProfit,
			fulfillmentType: resolvedFulfillment,
			sellAreas: resolvedAreas,
			category,
			charity: charityId,
			additionalInfo,
			subcategory,
			condition,
			brand,
			material,
			color,
			size,
			weight,
			dimensions: parsedDimensions,
			selectedCharityName,
			selectedCharityId,
			seller: userId,
			images,
			videos,
			quantity: parsedQuantity,
			stockRemaining: parsedQuantity,
			status: finalStatus,
			isArchived: false,
			socialPosting: parseSocialPostingInput(socialPosting),
		});

		const savedProduct = await newProduct.save();

		// Add the product to the respective user or charity's listedProducts
		const model = role === "USER" ? User : Charity;
		await model.findByIdAndUpdate(userId, {
			$push: { listedProducts: savedProduct._id },
		});

		// If the product is associated with a selected charity, add it to their listedProducts
		if (selectedCharityId) {
			await Charity.findByIdAndUpdate(selectedCharityId, {
				$push: { listedProducts: savedProduct._id },
			});
		}

		if (selectedCharityId && finalStatus === "LIVE") {
			const sellerProfile =
				role === "USER"
					? await User.findById(userId).select("firstName lastName")
					: await Charity.findById(userId).select("charityName firstName");
			const sellerName =
				role === "CHARITY"
					? sellerProfile?.charityName
					: `${sellerProfile?.firstName || ""} ${sellerProfile?.lastName || ""}`.trim();

			await notifyCharityNewListing({
				charityId: selectedCharityId,
				productId: savedProduct._id,
				productName: name,
				sellerName,
			});
		}

		return res.status(201).json({
			message:
				finalStatus === "PENDING_REVIEW"
					? "Product submitted for admin review. It will go live once approved."
					: "Product created successfully",
			product: savedProduct,
		});
	} catch (error) {
		console.error("Error creating product:", error);
		return res.status(500).json({ message: "Failed to create product." });
	}
};



// Fetch all products (public access)
export const getAllProducts = async (req, res) => {
	const { isArchived , status, promoted} = req.query;

	try {
		const query = {
			...(status ? { status } : { status: "LIVE" }),
		};
		if (promoted === "true") {
			query.isPromoted = true;
		}
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; 
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName profileImage addresses charityName")
			.populate("charity", "charityName charityID profileImage addresses")
			.sort({ createdAt: -1 }); 

		if (!products || products.length === 0) {
			return res.status(200).json({ products: [] });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0],
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching all products:", error);
		return res.status(500).json({ message: "Failed to fetch all products." });
	}
};

// Fetch products by category (public access)
export const getProductsByCategory = async (req, res) => {
	const { category } = req.params; 
	const { isArchived, status } = req.query; 

	try {
		const query = {
			category,
			...(isArchived !== undefined && { isArchived: isArchived === 'true' }),
			...(status && { status }),
		};

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
			.sort({ createdAt: -1 }); // Sort products by the latest creation date

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found for this category." });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));
		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching products by category:", error);
		return res.status(500).json({ message: "Failed to fetch products by category." });
	}
};

// Fetch products by category or subcategory (public access)
export const getCategoryProducts = async (req, res) => {
	const { category, subcategory } = req.query; // Extract category and subcategory from query parameters
	const { isArchived , status} = req.query; // Optional query to handle archived state

	try {
		const query = {
			...(status && { status }),
		}; // Initialize query object
		const exact = value => ({
			$regex: `^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
			$options: "i",
		});
		if (category) query.category = exact(category);
		if (subcategory) query.subcategory = exact(subcategory);
		if (isArchived !== undefined) {
			query.isArchived = isArchived === "true"; // Handle archived filter
		} else {
			query.isArchived = false; // Default to showing only active products
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
			.sort({ createdAt: -1 }); // Sort by creation date (newest first)

		if (!products || products.length === 0) {
			return res.status(200).json({ products: [] });
		}
		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching category products:", error);
		return res.status(500).json({ message: "Failed to fetch category products." });
	}
};

// Fetch latest 10 products (public access)
export const getProductsByLatest = async (_req, res) => {
	try {
		const products = await Product.find({ isArchived: false, status: "LIVE" })
			.populate("seller", "firstName lastName userName profileImage  addresses charityName")
			.populate("charity", "charityName charityID profileImage   addresses")
			.sort({ createdAt: -1 })
			.limit(10);

		if (!products || products.length === 0) {
			return res.status(404).json({ message: "No products found." });
		} 

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0],
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching latest products:", error);
		return res.status(500).json({ message: "Failed to fetch latest products." });
	}
};

// Controller for fetching related products
export const getRelatedProducts = async (req, res) => {
	const { category } = req.query;

	try {
		const products = await Product.find({ category, isArchived: false, status: "LIVE" })
			.sort({ createdAt: -1 })
			.limit(10)
			.populate('charity', 'charityName profileImage');

		if (!products.length) {
			return res.status(404).json({ message: 'No related products found.' });
		}

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (err) {
		console.error('Error fetching related products:', err);
		res.status(500).json({ message: 'Failed to fetch related products.' });
	}
};



// Get Product Details (Public Access)
export const getProductDetails = async (req, res) => {
	const { productId } = req.params;

	try {
		const product = await Product.findOne(resolveProductLookup(productId))
			.populate("seller", "_id firstName lastName charityName email profileImage  addresses")
			.populate("charity", "charityName email charityID storefrontId profileImage  addresses");

		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}

		const resolvedId = product._id.toString();

		// Determine the seller type
		let sellerType = null;

		if (product.seller) {
			sellerType = "USER";
		} else if (product.charity) {
			sellerType = "CHARITY";
		}

		// Return product details with charity and seller info
		const reviewSummary = await getReviewSummaryForProduct(resolvedId);

		return res.status(200).json({
			product: {
				id: product._id,
				slug: product.slug,
				name: product.name,
				additionalInfo: product.additionalInfo,
				price: product.price,
				charityProfit: product.charityProfit,
				sellerSharePercent: product.sellerSharePercent ?? 0,
				sellerProfit: product.sellerProfit ?? 0,
				fulfillmentType: product.fulfillmentType || "uk_shipping",
				sellAreas: product.sellAreas || [],
				description: product.additionalInfo,
				images: product.images,
				videos: product.videos || [],
				checkoutMode: product.checkoutMode || "stripe",
				ebayItemId: product.ebayItemId,
				ebayAffiliateUrl:
					product.ebayAffiliateUrl ||
					(product.ebayItemId
						? `https://www.ebay.co.uk/itm/${product.ebayItemId}${
								process.env.EBAY_CAMPAIGN_ID
									? `?campid=${process.env.EBAY_CAMPAIGN_ID}&customid=angelpage`
									: ""
							}`
						: null),
				isPromoted: product.isPromoted || false,
				socialPosting: product.socialPosting,
				reviewSummary,
				category: product.category,
				subcategory: product.subcategory,
				condition: product.condition,
				brand: product.brand,
				material: product.material,
				color: product.color,
				size: product.size,
				status: product.status,
				weight: product.weight,
				dimensions: {
					height: product.dimensions?.height || null,
					width: product.dimensions?.width || null,
					depth: product.dimensions?.depth || null,
				},
				createdAt: product.createdAt,
				charity: {
					id: product.charity?._id,
					charityName: product.charity?.charityName,
					charityID: product.charity?.charityID,
					storefrontId: product.charity?.storefrontId,
					profileImage: product.charity?.profileImage,
					address: product.charity?.addresses?.[0],
				},
				sellerType,
				seller: {
					id: product.seller?._id || product.charity?._id,
					firstName: product.seller?.firstName,
					lastName: product.seller?.lastName,
					charityName: product.charity?.charityName,
					profileImage: product.seller?.profileImage || product.charity?.profileImage,
					address: product.seller?.addresses?.[0] || product.charity?.addresses?.[0],
				},
			},
		});
	} catch (error) {
		console.error("Error fetching product details:", error);
		return res
			.status(500)
			.json({ message: "Failed to fetch product details." });
	}
};



export const getListingProducts = async (req, res) => {
	const { userId, role } = req.user; 
	const { status, isArchived } = req.query; 

	try {
		const query = {
			seller: userId, 
		};

		if (status) query.status = status; // Filter by status (e.g., DRAFT or LIVE)
		if (isArchived !== undefined) query.isArchived = isArchived === "true"; 


		if (role === "CHARITY") {
			query.$or = [{ seller: userId }, { charity: userId }];
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName userName profileImage  addresses")
			.populate("charity", "charityName charityID profileImage addresses")
			.sort({ createdAt: -1 });

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], 
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching user products:", error);
		res.status(500).json({ message: "Failed to fetch user products." });
	}
};



// Edit a product
export const editProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Verify ownership
		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		if (!isOwner) {
			return res.status(403).json({ message: "Unauthorized to edit this product" });
		}

		// Allow edits for `DRAFT` or `LIVE` only
		if (product.isArchived) {
			return res.status(400).json({ message: "Cannot edit archived products" });
		}

		const { socialPosting, sellerSharePercent, fulfillmentType, sellAreas, ...rest } =
			req.body;
		Object.assign(product, rest);
		if (sellerSharePercent !== undefined) {
			product.sellerSharePercent = Math.min(
				100,
				Math.max(0, parseFloat(sellerSharePercent) || 0),
			);
		}
		if (fulfillmentType !== undefined) {
			product.fulfillmentType = parseFulfillmentType(fulfillmentType);
		}
		if (sellAreas !== undefined) {
			product.sellAreas = parseSellAreas(sellAreas);
		}
		if (product.price != null) {
			const split = calculateProfitSplit(
				product.price,
				product.sellerSharePercent ?? 0,
			);
			product.charityProfit = split.charityProfit;
			product.sellerProfit = split.sellerProfit;
		}
		if (rest.name && rest.name !== product.name) {
			product.slug = await buildUniqueProductSlug(rest.name, product._id);
		}
		if (socialPosting !== undefined) {
			product.socialPosting = parseSocialPostingInput(socialPosting);
		}
		await product.save();

		res.status(200).json({ message: "Product updated successfully", product });
	} catch (error) {
		console.error("Error editing product:", error);
		res.status(500).json({ message: "Failed to edit product" });
	}
};


// Archive (soft delete) a product
export const archiveProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		if (!isOwner) {
			return res.status(403).json({ message: "Unauthorized to archive this product" });
		}

		product.status = "REMOVED";
		product.isArchived = true;

		await product.save();

		res.status(200).json({ message: "Product archived successfully", product });
	} catch (error) {
		console.error("Error archiving product:", error);
		res.status(500).json({ message: "Failed to archive product" });
	}
};

// Re-list an archived or sold product
export const relistProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";
		const { quantity } = req.body;

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		if (!isOwner) {
			return res.status(403).json({ message: "Unauthorized to re-list this product" });
		}

		const parsedQuantity = Math.max(1, parseInt(quantity, 10) || product.quantity || 1);
		product.isArchived = false;
		product.status = "PENDING_REVIEW";
		product.quantity = parsedQuantity;
		product.stockRemaining = parsedQuantity;
		await product.save();

		res.status(200).json({
			message: "Product submitted for admin review before going live",
			product,
		});
	} catch (error) {
		console.error("Error re-listing product:", error);
		res.status(500).json({ message: "Failed to re-list product" });
	}
};


export const getDraftProducts = async (req, res) => {
	try {
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const query = isCharity
			? { charity: userId, status: "DRAFT", isArchived: false }
			: { seller: userId, status: "DRAFT", isArchived: false };

		const products = await Product.find(query);

		res.status(200).json({ products });
	} catch (error) {
		console.error("Error fetching draft products:", error);
		res.status(500).json({ message: "Failed to fetch draft products" });
	}
};


// Permanently delete a product
export const deleteProduct = async (req, res) => {
	const { productId } = req.params;

	try {
		const deletedProduct = await Product.findByIdAndDelete(productId);
		if (!deletedProduct) {
			return res.status(404).json({ message: "Product not found." });
		}

		// Remove product reference from the respective user/charity
		await User.updateMany(
			{ listedProducts: productId },
			{ $pull: { listedProducts: productId } },
		);
		await Charity.updateMany(
			{ listedProducts: productId },
			{ $pull: { listedProducts: productId } },
		);

		return res.status(200).json({ message: "Product deleted successfully." });
	} catch (error) {
		console.error("Error deleting product:", error);
		return res.status(500).json({ message: "Failed to delete product." });
	}
};


// Get role-based product listings (USER or CHARITY)
export const getRoleBasedListings = async (req, res) => {
	const { userId, role } = req.user;
	const { status, isArchived } = req.query;

	try {
		const query = {
			isArchived: isArchived === "true" ? true : false,
		};

		if (role === "USER") {
			query.seller = userId;
		} else if (isCharityAccountRole(role)) {
			const charityId = resolveCharityId(req.user);
			query.$or = [{ charity: charityId }, { seller: charityId }];
		} else {
			return res.status(403).json({ message: "Access denied. Invalid role." });
		}

		if (status) {
			query.status = status; // Filter by status if provided
		}

		const products = await Product.find(query)
			.populate("seller", "firstName lastName profileImage addresses")
			.populate("charity", "charityName profileImage addresses")
			.sort({ createdAt: -1 });

		const productsWithAddress = products.map(product => ({
			...product.toObject(),
			id: product._id,
			name: product.name,
			additionalInfo: product.additionalInfo,
			price: product.price,
			charityProfit: product.charityProfit,
			description: product.additionalInfo,
			selectedCharityName: product.selectedCharityName,
            selectedCharityId: product.selectedCharityId, 
			images: product.images,
			category: product.category,
			subcategory: product.subcategory,
			condition: product.condition,
			brand: product.brand,
			material: product.material,
			color: product.color,
			size: product.size,
			status: product.status,
			socialPosting: product.socialPosting,
			videos: product.videos,
			dimensions: {
				height: product.dimensions?.height || null,
				width: product.dimensions?.width || null,
				depth: product.dimensions?.depth || null,
			},
			createdAt: product.createdAt,
			seller: {
				firstName: product.seller?.firstName,
				lastName: product.seller?.lastName,
				profileImage: product.seller?.profileImage,
				address: product.seller?.addresses?.[0], // Include default address
			},
			charity: {
				charityName: product.charity?.charityName,
				charityID: product.charity?.charityID,
				profileImage: product.charity?.profileImage,
				address: product.charity?.addresses?.[0],
			},
		}));

		return res.status(200).json({ products: productsWithAddress });
	} catch (error) {
		console.error("Error fetching listings:", error);
		res.status(500).json({ message: "Failed to fetch listings." });
	}
};

export const getPendingReviewProducts = async (req, res) => {
	try {
		const products = await Product.find({ status: "PENDING_REVIEW", isArchived: false })
			.populate("seller", "firstName lastName email profileImage")
			.populate("charity", "charityName email profileImage")
			.sort({ createdAt: -1 });

		return res.status(200).json({ products });
	} catch (error) {
		console.error("Error fetching pending products:", error);
		return res.status(500).json({ message: "Failed to fetch pending products." });
	}
};

export const reviewProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const { action, reason, socialPosting } = req.body;

		if (!["approve", "reject"].includes(action)) {
			return res.status(400).json({ message: "Action must be approve or reject." });
		}

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}

		if (product.status !== "PENDING_REVIEW") {
			return res.status(400).json({ message: "Product is not pending review." });
		}

		if (action === "approve") {
			if (socialPosting !== undefined) {
				product.socialPosting = parseSocialPostingInput(socialPosting);
			}
			product.status = "LIVE";
			await product.save();

			if (product.selectedCharityId) {
				const sellerProfile = product.seller
					? await User.findById(product.seller).select("firstName lastName")
					: await Charity.findById(product.charity).select("charityName");
				const sellerName = sellerProfile?.charityName
					? sellerProfile.charityName
					: `${sellerProfile?.firstName || ""} ${sellerProfile?.lastName || ""}`.trim();

				await notifyCharityNewListing({
					charityId: product.selectedCharityId,
					productId: product._id,
					productName: product.name,
					sellerName,
				});
			}

			queueAutoPostNewListing(product).catch((err) =>
				console.error("Social auto-post queue failed:", err),
			);

			if (product.seller) {
				const seller = await User.findById(product.seller).select("email firstName");
				if (seller?.email) {
					fireMarketingEvent(JOURNEY_EVENTS.PRODUCT_APPROVED, {
						email: seller.email,
						productId: product._id.toString(),
						productName: product.name,
						firstName: seller.firstName,
					});
				}
			}

			return res.status(200).json({ message: "Product approved and is now live.", product });
		}

		product.status = "DRAFT";
		if (reason) {
			product.additionalInfo = `${product.additionalInfo || ""}\n\n[Admin rejection]: ${reason}`.trim();
		}
		await product.save();

		return res.status(200).json({ message: "Product rejected and returned to draft.", product });
	} catch (error) {
		console.error("Error reviewing product:", error);
		return res.status(500).json({ message: "Failed to review product." });
	}
};

export const updateProductSocialPosting = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const isCharity = req.user?.role === "CHARITY";

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const isOwner = isCharity
			? product.charity?.toString() === userId
			: product.seller?.toString() === userId;

		const isAdmin = isAdminUser(req.user?.role);

		if (!isOwner && !isAdmin) {
			return res.status(403).json({ message: "Unauthorized to update this product" });
		}

		product.socialPosting = parseSocialPostingInput(req.body);
		await product.save();

		return res.status(200).json({
			message: "Social posting preferences updated",
			socialPosting: product.socialPosting,
			product,
		});
	} catch (error) {
		console.error("Error updating social posting preferences:", error);
		return res.status(500).json({ message: "Failed to update social posting preferences." });
	}
};

export const searchSuggest = async (req, res) => {
	try {
		const { q = "", limit = 8 } = req.query;
		if (!q || String(q).trim().length < 2) {
			return res.status(200).json({ suggestions: [] });
		}
		const regex = new RegExp(String(q).trim(), "i");
		const products = await Product.find({
			status: "LIVE",
			isArchived: false,
			$or: [{ name: regex }, { brand: regex }, { category: regex }],
		})
			.select("name brand category price images slug")
			.limit(Number(limit));
		res.status(200).json({ suggestions: products });
	} catch (error) {
		res.status(500).json({ message: "Search suggest failed." });
	}
};

export const setProductPromoted = async (req, res) => {
	try {
		const { productId } = req.params;
		const { isPromoted } = req.body;
		if (typeof isPromoted !== "boolean") {
			return res.status(400).json({ message: "isPromoted boolean required." });
		}
		const product = await Product.findByIdAndUpdate(
			productId,
			{ isPromoted },
			{ new: true },
		);
		if (!product) return res.status(404).json({ message: "Product not found." });
		res.status(200).json({ message: "Promoted status updated.", product });
	} catch (error) {
		res.status(500).json({ message: "Failed to update promoted status." });
	}
};

export const getEbayAffiliateFeed = async (req, res) => {
	try {
		const { fetchEbayCuratedFeed } = await import("../../services/ebayAffiliate.service.js");
		const { limit, offset } = req.query;
		const items = await fetchEbayCuratedFeed({
			limit: parseInt(limit, 10) || 50,
			offset: parseInt(offset, 10) || 0,
		});
		return res.status(200).json({ items });
	} catch (error) {
		console.error("eBay affiliate feed error:", error);
		return res.status(500).json({ message: error.message || "Failed to fetch eBay affiliate feed." });
	}
};

export const bulkCreateProducts = async (req, res) => {
	const { products: items, status: requestedBulkStatus = "PENDING_REVIEW" } = req.body;
	const { userId, role } = req.user;

	if (!Array.isArray(items) || items.length === 0) {
		return res.status(400).json({ message: "A products array is required." });
	}
	if (items.length > 50) {
		return res.status(400).json({ message: "Maximum 50 products per bulk upload." });
	}

	const { CHARITY_SHARE_RATE } = await import("../../constants/platformPolicy.js");
	const created = [];
	const failed = [];

	let charityId = null;
	if (role === "CHARITY") {
		charityId = userId;
	}

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		try {
			const { name, price, category, charity, subcategory, condition, brand, quantity } = item;

			if (!name || price == null || !category) {
				throw new Error("name, price, and category are required");
			}

			const numericPrice = parseFloat(price);
			if (Number.isNaN(numericPrice) || numericPrice < 1) {
				throw new Error("price must be at least 1");
			}

			const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
			let itemCharityId = charityId;
			if (role === "USER") {
				if (!charity && requestedBulkStatus !== "DRAFT") {
					throw new Error("charity is required for USER listings");
				}
				itemCharityId = charity || null;
			}

			let finalStatus = requestedBulkStatus;
			if (finalStatus === "LIVE") {
				finalStatus = "PENDING_REVIEW";
			}

			const charityProfit =
				item.charityProfit != null
					? parseFloat(item.charityProfit)
					: numericPrice * CHARITY_SHARE_RATE;

			const product = new Product({
				name,
				slug: await buildUniqueProductSlug(name),
				price: numericPrice,
				charityProfit,
				category,
				subcategory: subcategory || "",
				condition: condition || "",
				brand: brand || "",
				charity: itemCharityId,
				seller: userId,
				quantity: parsedQuantity,
				stockRemaining: parsedQuantity,
				status: finalStatus,
				isArchived: false,
				images: [],
				additionalInfo: item.additionalInfo || "",
			});

			const saved = await product.save();
			const model = role === "USER" ? User : Charity;
			await model.findByIdAndUpdate(userId, {
				$push: { listedProducts: saved._id },
			});
			created.push(saved);
		} catch (err) {
			failed.push({ row: i + 1, name: item?.name, error: err.message });
		}
	}

	return res.status(201).json({
		message: `${created.length} product(s) submitted. ${failed.length} failed.`,
		createdCount: created.length,
		failedCount: failed.length,
		created,
		failed,
	});
};
