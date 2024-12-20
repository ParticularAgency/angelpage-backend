"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const products_controller_1 = require("./products.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
// Configure multer for file handling
const upload = (0, multer_1.default)({ dest: "uploads/" });
const router = (0, express_1.Router)();
// Create a product
router.post("/create", (0, auth_middleware_1.authMiddleware)(), upload.array("images", 10), // Allow up to 10 images
products_controller_1.createProduct);
// List all products
router.get("/all", products_controller_1.getAllProducts);
// Public endpoint to fetch category-based products
router.get("/category", products_controller_1.getCategoryProducts);
// Get product details by ID
router.get("/details/:productId", products_controller_1.getProductDetails);
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
// Archive (soft delete) a product by ID
router.patch("/:productId/archive", (0, auth_middleware_1.authMiddleware)(), products_controller_1.archiveProduct);
// Archive (draft product) a product by ID
router.patch("/:productId/draft", (0, auth_middleware_1.authMiddleware)(), products_controller_1.getDraftProducts);
// Fetch products based on user role (USER or CHARITY)
router.get("/listings", (0, auth_middleware_1.authMiddleware)(), products_controller_1.getRoleBasedListings);
// Permanently delete a product by ID
router.delete("/:productId", (0, auth_middleware_1.authMiddleware)(), products_controller_1.deleteProduct);
exports.default = router;
