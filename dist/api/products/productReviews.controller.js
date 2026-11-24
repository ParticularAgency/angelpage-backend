"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminUser = exports.canUserReviewProduct = exports.moderateProductReview = exports.getPendingProductReviews = exports.createProductReview = exports.getProductReviews = exports.getReviewSummaryForProduct = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ProductReview_model_1 = __importDefault(require("../../models/ProductReview.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const isAdminUser = (role) => ["ADMIN", "OPS_ADMIN", "CONTENT_ADMIN", "FINANCE_ADMIN"].includes(role);
exports.isAdminUser = isAdminUser;
const getReviewSummaryForProduct = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return { averageRating: 0, reviewCount: 0, verifiedCount: 0, trustLabel: null };
    }
    const [stats] = yield ProductReview_model_1.default.aggregate([
        {
            $match: {
                product: new mongoose_1.default.Types.ObjectId(productId),
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
    }
    else if (reviewCount >= 1 && verifiedCount >= 1) {
        trustLabel = "Verified buyer reviews";
    }
    return { averageRating, reviewCount, verifiedCount, trustLabel };
});
exports.getReviewSummaryForProduct = getReviewSummaryForProduct;
const userPurchasedProduct = (userId, productId) => __awaiter(void 0, void 0, void 0, function* () {
    const order = yield Order_model_1.default.findOne({
        buyerId: userId,
        paymentStatus: "Paid",
        "products.productId": productId,
    });
    return order;
});
const getProductReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const reviews = yield ProductReview_model_1.default.find({
            product: productId,
            status: "approved",
        })
            .populate("user", "firstName lastName profileImage")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const summary = yield (0, exports.getReviewSummaryForProduct)(productId);
        return res.status(200).json({
            summary,
            reviews: reviews.map((r) => {
                var _a, _b, _c;
                return ({
                    id: r._id,
                    rating: r.rating,
                    comment: r.comment,
                    verifiedPurchase: r.verifiedPurchase,
                    createdAt: r.createdAt,
                    user: {
                        firstName: ((_a = r.user) === null || _a === void 0 ? void 0 : _a.firstName) || "Angelpage",
                        lastName: ((_b = r.user) === null || _b === void 0 ? void 0 : _b.lastName) ? `${r.user.lastName.charAt(0)}.` : "buyer",
                        profileImage: ((_c = r.user) === null || _c === void 0 ? void 0 : _c.profileImage) || "",
                    },
                });
            }),
        });
    }
    catch (error) {
        console.error("Error fetching product reviews:", error);
        return res.status(500).json({ message: "Failed to fetch reviews." });
    }
});
exports.getProductReviews = getProductReviews;
const createProductReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { rating, comment } = req.body;
        if (!userId || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== "USER") {
            return res.status(403).json({
                message: "Only registered buyers can leave product reviews.",
            });
        }
        const product = yield Product_model_1.default.findById(productId);
        if (!product || product.status !== "LIVE") {
            return res.status(404).json({ message: "Product not found." });
        }
        if (((_c = product.seller) === null || _c === void 0 ? void 0 : _c.toString()) === userId) {
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
        const existing = yield ProductReview_model_1.default.findOne({ product: productId, user: userId });
        if (existing) {
            return res.status(400).json({
                message: "You have already reviewed this product.",
            });
        }
        const purchaseOrder = yield userPurchasedProduct(userId, productId);
        const review = yield ProductReview_model_1.default.create({
            product: productId,
            user: userId,
            order: purchaseOrder === null || purchaseOrder === void 0 ? void 0 : purchaseOrder._id,
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
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 11000) {
            return res.status(400).json({ message: "You have already reviewed this product." });
        }
        console.error("Error creating product review:", error);
        return res.status(500).json({ message: "Failed to submit review." });
    }
});
exports.createProductReview = createProductReview;
const getPendingProductReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield ProductReview_model_1.default.find({ status: "pending" })
            .populate("user", "firstName lastName email")
            .populate("product", "name price images status")
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ reviews });
    }
    catch (error) {
        console.error("Error fetching pending reviews:", error);
        return res.status(500).json({ message: "Failed to fetch pending reviews." });
    }
});
exports.getPendingProductReviews = getPendingProductReviews;
const moderateProductReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reviewId } = req.params;
        const { action, adminNote } = req.body;
        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: "Action must be approve or reject." });
        }
        const review = yield ProductReview_model_1.default.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }
        review.status = action === "approve" ? "approved" : "rejected";
        if (adminNote)
            review.adminNote = String(adminNote);
        yield review.save();
        return res.status(200).json({
            message: action === "approve" ? "Review approved." : "Review rejected.",
            review,
        });
    }
    catch (error) {
        console.error("Error moderating review:", error);
        return res.status(500).json({ message: "Failed to moderate review." });
    }
});
exports.moderateProductReview = moderateProductReview;
const canUserReviewProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(200).json({ canReview: false, reason: "login_required" });
        }
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== "USER") {
            return res.status(200).json({ canReview: false, reason: "buyers_only" });
        }
        const product = yield Product_model_1.default.findById(productId).select("seller status");
        if (!product || product.status !== "LIVE") {
            return res.status(200).json({ canReview: false, reason: "not_found" });
        }
        if (((_c = product.seller) === null || _c === void 0 ? void 0 : _c.toString()) === userId) {
            return res.status(200).json({ canReview: false, reason: "own_listing" });
        }
        const existing = yield ProductReview_model_1.default.findOne({ product: productId, user: userId });
        if (existing) {
            return res.status(200).json({
                canReview: false,
                reason: "already_reviewed",
                reviewStatus: existing.status,
            });
        }
        const purchaseOrder = yield userPurchasedProduct(userId, productId);
        return res.status(200).json({
            canReview: true,
            verifiedPurchase: !!purchaseOrder,
        });
    }
    catch (error) {
        console.error("Error checking review eligibility:", error);
        return res.status(500).json({ message: "Failed to check review eligibility." });
    }
});
exports.canUserReviewProduct = canUserReviewProduct;
