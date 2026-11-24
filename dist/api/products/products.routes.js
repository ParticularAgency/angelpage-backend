"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const appAllProducts_controller_1 = require("./appAllProducts.controller");
const products_controller_1 = require("./products.controller");
const productReviews_controller_1 = require("./productReviews.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
// Configure multer for file handling
const upload = (0, multer_1.default)({ dest: "uploads/" });
const router = (0, express_1.Router)();
router.post("/bulk", (0, auth_middleware_1.authMiddleware)(), products_controller_1.bulkCreateProducts);
// Create a product
router.post("/create", (0, auth_middleware_1.authMiddleware)(), upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 2 },
]), products_controller_1.createProduct);
// List all products
router.get("/all", products_controller_1.getAllProducts);
router.get("/search-suggest", products_controller_1.searchSuggest);
// Public endpoint to fetch category-based products
router.get("/category", products_controller_1.getCategoryProducts);
// Get product details by ID
router.get("/details/:productId", products_controller_1.getProductDetails);
router.get("/:productId/reviews", productReviews_controller_1.getProductReviews);
router.get("/:productId/reviews/eligibility", (0, auth_middleware_1.authMiddleware)(), productReviews_controller_1.canUserReviewProduct);
router.post("/:productId/reviews", (0, auth_middleware_1.authMiddleware)(), productReviews_controller_1.createProductReview);
router.get("/admin/reviews/pending", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), productReviews_controller_1.getPendingProductReviews);
router.patch("/admin/reviews/:reviewId", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), productReviews_controller_1.moderateProductReview);
// Fetch products by category
router.get("/category/:category", products_controller_1.getProductsByCategory);
// Fetch latest products
router.get("/listing/latest-products", products_controller_1.getProductsByLatest);
// Public endpoint to fetch related products
router.get("/related", products_controller_1.getRelatedProducts);
// global suggetion endpoint public access
router.get("/related", products_controller_1.getRelatedProducts);
// Fetch user's own listings
router.get("/mylistings", (0, auth_middleware_1.authMiddleware)(), products_controller_1.getListingProducts);
// Edit a product by ID
router.put("/:productId", (0, auth_middleware_1.authMiddleware)(), products_controller_1.editProduct);
router.patch("/:productId/social-posting", (0, auth_middleware_1.authMiddleware)(), products_controller_1.updateProductSocialPosting);
// Archive (soft delete) a product by ID
router.patch("/:productId/archive", (0, auth_middleware_1.authMiddleware)(), products_controller_1.archiveProduct);
// Re-list an archived product
router.patch("/:productId/relist", (0, auth_middleware_1.authMiddleware)(), products_controller_1.relistProduct);
// Archive (draft product) a product by ID
router.patch("/:productId/draft", (0, auth_middleware_1.authMiddleware)(), products_controller_1.getDraftProducts);
// Fetch products based on user role (USER or CHARITY)
router.get("/listings", (0, auth_middleware_1.authMiddleware)(), products_controller_1.getRoleBasedListings);
// Permanently delete a product by ID
router.delete("/:productId", (0, auth_middleware_1.authMiddleware)(), products_controller_1.deleteProduct);
// =====eBay charity products
// router.get("/:seller", getProductsBySeller);
router.get("/all-charity-products", appAllProducts_controller_1.getCharityProducts);
router.get("/charity/:charityName", appAllProducts_controller_1.getProductsByCharity);
router.get("/charities", appAllProducts_controller_1.getAvailableCharities);
router.get("/admin/pending-review", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), products_controller_1.getPendingReviewProducts);
router.patch("/:productId/review", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), products_controller_1.reviewProduct);
router.patch("/:productId/promoted", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), products_controller_1.setProductPromoted);
router.get("/ebay-affiliate/feed", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), products_controller_1.getEbayAffiliateFeed);
exports.default = router;
