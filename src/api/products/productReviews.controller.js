import mongoose from "mongoose";
import ProductReview from "../../models/ProductReview.model";
import Product from "../../models/Product.model";
import Order from "../../models/Order.model";

const isAdminUser = (role) =>
	["ADMIN", "OPS_ADMIN", "CONTENT_ADMIN", "FINANCE_ADMIN"].includes(role);

export const getReviewSummaryForProduct = async (productId) => {
	if (!mongoose.Types.ObjectId.isValid(productId)) {
		return { averageRating: 0, reviewCount: 0, verifiedCount: 0, trustLabel: null };
	}

	const [stats] = await ProductReview.aggregate([
		{
			$match: {
				product: new mongoose.Types.ObjectId(productId),
				status: "approved",
			},
		},
		{
			$group: {
				_id: null,
				averageRating: { $avg: "$rating" },
				reviewCount: { $sum: 1 },
				verifiedCount: {
					$sum: { $cond: ["$verifiedPurchase", 1, 0] },
				},
			},
		},
	]);

	if (!stats) {
		return { averageRating: 0, reviewCount: 0, verifiedCount: 0, trustLabel: null };
	}

	const averageRating = Math.round((stats.averageRating || 0) * 10) / 10;
	const reviewCount = stats.reviewCount || 0;
	const verifiedCount = stats.verifiedCount || 0;

	let trustLabel = null;
	if (reviewCount >= 3 && averageRating >= 4) {
		trustLabel = "Trusted listing";
	} else if (reviewCount >= 1 && verifiedCount >= 1) {
		trustLabel = "Verified buyer reviews";
	}

	return { averageRating, reviewCount, verifiedCount, trustLabel };
};

const userPurchasedProduct = async (userId, productId) => {
	const order = await Order.findOne({
		buyerId: userId,
		paymentStatus: "Paid",
		"products.productId": productId,
	});
	return order;
};

export const getProductReviews = async (req, res) => {
	try {
		const { productId } = req.params;
		const reviews = await ProductReview.find({
			product: productId,
			status: "approved",
		})
			.populate("user", "firstName lastName profileImage")
			.sort({ createdAt: -1 })
			.limit(50)
			.lean();

		const summary = await getReviewSummaryForProduct(productId);

		return res.status(200).json({
			summary,
			reviews: reviews.map((r) => ({
				id: r._id,
				rating: r.rating,
				comment: r.comment,
				verifiedPurchase: r.verifiedPurchase,
				createdAt: r.createdAt,
				user: {
					firstName: r.user?.firstName || "Angelpage",
					lastName: r.user?.lastName ? `${r.user.lastName.charAt(0)}.` : "buyer",
					profileImage: r.user?.profileImage || "",
				},
			})),
		});
	} catch (error) {
		console.error("Error fetching product reviews:", error);
		return res.status(500).json({ message: "Failed to fetch reviews." });
	}
};

export const createProductReview = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;
		const { rating, comment } = req.body;

		if (!userId || req.user?.role !== "USER") {
			return res.status(403).json({
				message: "Only registered buyers can leave product reviews.",
			});
		}

		const product = await Product.findById(productId);
		if (!product || product.status !== "LIVE") {
			return res.status(404).json({ message: "Product not found." });
		}

		if (product.seller?.toString() === userId) {
			return res.status(400).json({
				message: "You cannot review your own listing.",
			});
		}

		const numericRating = Number(rating);
		if (!numericRating || numericRating < 1 || numericRating > 5) {
			return res.status(400).json({ message: "Rating must be between 1 and 5." });
		}

		const trimmedComment = String(comment || "").trim();
		if (trimmedComment.length < 10) {
			return res.status(400).json({
				message: "Please write at least 10 characters in your review.",
			});
		}

		const existing = await ProductReview.findOne({ product: productId, user: userId });
		if (existing) {
			return res.status(400).json({
				message: "You have already reviewed this product.",
			});
		}

		const purchaseOrder = await userPurchasedProduct(userId, productId);

		const review = await ProductReview.create({
			product: productId,
			user: userId,
			order: purchaseOrder?._id,
			rating: numericRating,
			comment: trimmedComment,
			verifiedPurchase: !!purchaseOrder,
			status: "pending",
		});

		return res.status(201).json({
			message: purchaseOrder
				? "Thank you! Your verified review is pending admin approval."
				: "Thank you! Your review is pending admin approval.",
			review: {
				id: review._id,
				status: review.status,
				verifiedPurchase: review.verifiedPurchase,
			},
		});
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(400).json({ message: "You have already reviewed this product." });
		}
		console.error("Error creating product review:", error);
		return res.status(500).json({ message: "Failed to submit review." });
	}
};

export const getPendingProductReviews = async (req, res) => {
	try {
		const reviews = await ProductReview.find({ status: "pending" })
			.populate("user", "firstName lastName email")
			.populate("product", "name price images status")
			.sort({ createdAt: -1 })
			.limit(100);

		return res.status(200).json({ reviews });
	} catch (error) {
		console.error("Error fetching pending reviews:", error);
		return res.status(500).json({ message: "Failed to fetch pending reviews." });
	}
};

export const moderateProductReview = async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { action, adminNote } = req.body;

		if (!["approve", "reject"].includes(action)) {
			return res.status(400).json({ message: "Action must be approve or reject." });
		}

		const review = await ProductReview.findById(reviewId);
		if (!review) {
			return res.status(404).json({ message: "Review not found." });
		}

		review.status = action === "approve" ? "approved" : "rejected";
		if (adminNote) review.adminNote = String(adminNote);
		await review.save();

		return res.status(200).json({
			message: action === "approve" ? "Review approved." : "Review rejected.",
			review,
		});
	} catch (error) {
		console.error("Error moderating review:", error);
		return res.status(500).json({ message: "Failed to moderate review." });
	}
};

export const canUserReviewProduct = async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user?.userId;

		if (!userId) {
			return res.status(200).json({ canReview: false, reason: "login_required" });
		}

		if (req.user?.role !== "USER") {
			return res.status(200).json({ canReview: false, reason: "buyers_only" });
		}

		const product = await Product.findById(productId).select("seller status");
		if (!product || product.status !== "LIVE") {
			return res.status(200).json({ canReview: false, reason: "not_found" });
		}

		if (product.seller?.toString() === userId) {
			return res.status(200).json({ canReview: false, reason: "own_listing" });
		}

		const existing = await ProductReview.findOne({ product: productId, user: userId });
		if (existing) {
			return res.status(200).json({
				canReview: false,
				reason: "already_reviewed",
				reviewStatus: existing.status,
			});
		}

		const purchaseOrder = await userPurchasedProduct(userId, productId);

		return res.status(200).json({
			canReview: true,
			verifiedPurchase: !!purchaseOrder,
		});
	} catch (error) {
		console.error("Error checking review eligibility:", error);
		return res.status(500).json({ message: "Failed to check review eligibility." });
	}
};

export { isAdminUser };
