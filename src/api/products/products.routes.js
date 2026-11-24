import { Router } from "express";
import multer from "multer";
import { getCharityProducts, getProductsByCharity, getAvailableCharities } from "./appAllProducts.controller";
import {
	createProduct,
	editProduct,
	archiveProduct,
	relistProduct,
	deleteProduct,
	getCategoryProducts,
	getAllProducts,
	getProductDetails,
	getProductsByCategory,
	getProductsByLatest,
	getRoleBasedListings,
	getListingProducts,
	getRelatedProducts,
	getDraftProducts,
	getPendingReviewProducts,
	reviewProduct,
	getEbayAffiliateFeed,
	bulkCreateProducts,
	searchSuggest,
	setProductPromoted,
	updateProductSocialPosting,
} from "./products.controller";
import {
	createProductReview,
	getProductReviews,
	getPendingProductReviews,
	moderateProductReview,
	canUserReviewProduct,
} from "./productReviews.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

// Configure multer for file handling
const upload = multer({ dest: "uploads/" });

const router = Router();

router.post(
	"/bulk",
	authMiddleware(),
	bulkCreateProducts,
);

// Create a product
router.post(
	"/create",
	authMiddleware(),
	upload.fields([
		{ name: "images", maxCount: 10 },
		{ name: "videos", maxCount: 2 },
	]),
	createProduct,
);



// List all products
router.get("/all", getAllProducts);
router.get("/search-suggest", searchSuggest);

// Public endpoint to fetch category-based products
router.get("/category", getCategoryProducts);

// Get product details by ID
router.get("/details/:productId", getProductDetails);

router.get("/:productId/reviews", getProductReviews);
router.get(
	"/:productId/reviews/eligibility",
	authMiddleware(),
	canUserReviewProduct,
);
router.post("/:productId/reviews", authMiddleware(), createProductReview);

router.get(
	"/admin/reviews/pending",
	authMiddleware(["ADMIN"]),
	getPendingProductReviews,
);
router.patch(
	"/admin/reviews/:reviewId",
	authMiddleware(["ADMIN"]),
	moderateProductReview,
);

// Fetch products by category
router.get("/category/:category", getProductsByCategory);

// Fetch latest products
router.get("/listing/latest-products", getProductsByLatest);

// Public endpoint to fetch related products
router.get("/related", getRelatedProducts);

// global suggetion endpoint public access
router.get("/related", getRelatedProducts);

// Fetch user's own listings
router.get("/mylistings", authMiddleware(), getListingProducts);




// Edit a product by ID
router.put("/:productId", authMiddleware(), editProduct);

router.patch(
	"/:productId/social-posting",
	authMiddleware(),
	updateProductSocialPosting,
);

// Archive (soft delete) a product by ID
router.patch("/:productId/archive", authMiddleware(), archiveProduct);

// Re-list an archived product
router.patch("/:productId/relist", authMiddleware(), relistProduct);

// Archive (draft product) a product by ID
router.patch("/:productId/draft", authMiddleware(), getDraftProducts);

// Fetch products based on user role (USER or CHARITY)
router.get("/listings", authMiddleware(), getRoleBasedListings);

// Permanently delete a product by ID
router.delete("/:productId", authMiddleware(), deleteProduct);

// =====eBay charity products
// router.get("/:seller", getProductsBySeller);
router.get("/all-charity-products", getCharityProducts);
router.get("/charity/:charityName", getProductsByCharity);
router.get("/charities", getAvailableCharities);

router.get("/admin/pending-review", authMiddleware(["ADMIN"]), getPendingReviewProducts);
router.patch("/:productId/review", authMiddleware(["ADMIN"]), reviewProduct);
router.patch(
	"/:productId/promoted",
	authMiddleware(["ADMIN"]),
	setProductPromoted,
);
router.get("/ebay-affiliate/feed", authMiddleware(["ADMIN"]), getEbayAffiliateFeed);

export default router;
