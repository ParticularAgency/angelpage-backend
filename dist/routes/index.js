"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../api/auth/auth.routes")); // Adjust the path as necessary, based on your folder structure
const admin_routes_1 = __importDefault(require("../api/admin/admin.routes")); // Adjust the path as necessary, based on your folder structure
const charities_routes_1 = __importDefault(require("../api/charities/charities.routes")); // Adjust the path as necessary, based on your folder structure
const users_routes_1 = __importDefault(require("../api/users/users.routes")); // Adjust the path as necessary, based on your folder structure
const favorites_routes_1 = __importDefault(require("../api/favorites/favorites.routes")); // Adjust the path as necessary, based on your folder structure
const storefront_routes_1 = __importDefault(require("../api/storefront/storefront.routes")); // Adjust the path as necessary, based on your folder structure
const products_routes_1 = __importDefault(require("../api/products/products.routes")); // Adjust the path as necessary, based on your folder structure
const cart_routes_1 = __importDefault(require("../api/cart/cart.routes")); // Adjust the path as necessary, based on your folder structure
const email_routes_1 = __importDefault(require("../api/email/email.routes")); // Adjust the path as necessary, based on your folder structure
const search_routes_1 = __importDefault(require("../api/Search/search.routes")); // Adjust the path as necessary, based on your folder structure
const router = (0, express_1.Router)();
// Simple health check route
router.get("/health", (req, res) => {
    res.status(200).json({ message: "Server is running" });
});
// User authentication routes
router.use("/auth", auth_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/admin", admin_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/users", users_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/charity", charities_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/favorites", favorites_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/storefront", storefront_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/products", products_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/cart", cart_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/email", email_routes_1.default); // All routes under "/auth" will be handled by authRoutes
router.use("/search", search_routes_1.default); // All routes under "/auth" will be handled by authRoutes
exports.default = router;
