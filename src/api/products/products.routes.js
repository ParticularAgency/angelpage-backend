import { Router } from "express";
import multer from "multer";
import {
	createProduct,
	editProduct,
	archiveProduct,
	deleteProduct,
	getCategoryProducts,
	getAllProducts,
	getProductDetails,
	getProductsByCategory,
	getProductsByLatest,
	getRoleBasedListings,
	getListingProducts,
	getRelatedProducts,
} from "./products.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

// Configure multer for file handling
const upload = multer({ dest: "uploads/" });

const router = Router();

// Create a product
router.post(
	"/create",
	authMiddleware(),
	upload.array("images", 10), // Allow up to 10 images
	createProduct,
);

// Edit a product by ID
router.put("/:productId", authMiddleware(), editProduct);

// Archive (soft delete) a product by ID
router.patch("/:productId/archive", authMiddleware(), archiveProduct);

// Permanently delete a product by ID
router.delete("/:productId", authMiddleware(), deleteProduct);

// List all products
router.get("/all", getAllProducts);

// Public endpoint to fetch category-based products
router.get("/category", getCategoryProducts);

// Get product details by ID
router.get("/details/:productId", getProductDetails);

// Fetch products by category
router.get("/category/:category", getProductsByCategory);

// Fetch latest products
router.get("/listing/latest-products", getProductsByLatest);

// Public endpoint to fetch related products
router.get("/related", getRelatedProducts);

// Fetch products based on user role (USER or CHARITY)
router.get("/listings", authMiddleware(), getRoleBasedListings);

// Fetch user's own listings
router.get("/mylistings", authMiddleware(), getListingProducts);

export default router;
