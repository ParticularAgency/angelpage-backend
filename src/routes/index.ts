import { Router } from "express";
import authRoutes from "../api/auth/auth.routes"; // Adjust the path as necessary, based on your folder structure
import adminRoutes from "../api/admin/admin.routes"; // Adjust the path as necessary, based on your folder structure
import charityRoutes from "../api/charities/charities.routes"; // Adjust the path as necessary, based on your folder structure
import userRoutes from "../api/users/users.routes"; // Adjust the path as necessary, based on your folder structure
import favoritesRoutes from "../api/favorites/favorites.routes"; // Adjust the path as necessary, based on your folder structure
import storefrontRoutes from "../api/storefront/storefront.routes"; // Adjust the path as necessary, based on your folder structure
import productsRoutes from "../api/products/products.routes"; // Adjust the path as necessary, based on your folder structure
import cartRoutes from "../api/cart/cart.routes"; // Adjust the path as necessary, based on your folder structure
import orderRoutes from "../api/orders/orders.routes"; // Adjust the path as necessary, based on your folder structure
import emailRoutes from "../api/email/email.routes"; // Adjust the path as necessary, based on your folder structure
import searchRoutes from "../api/Search/search.routes"; // Adjust the path as necessary, based on your folder structure
import notificationRoutes from "../api/notifications/notifications.routes"; // Adjust the path as necessary, based on your folder structure
import messageRoutes from "../api/messages/messages.routes"; // Adjust the path as necessary, based on your folder structure

const router = Router();

// Simple health check route
router.get("/health", (req, res) => {
	res.status(200).json({ message: "Server is running" });
});

// User authentication routes
router.use("/auth", authRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/admin", adminRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/users", userRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/charity", charityRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/favorites", favoritesRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/storefront", storefrontRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/products", productsRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/cart", cartRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/order", orderRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/email", emailRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/search", searchRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/notification", notificationRoutes); // All routes under "/auth" will be handled by authRoutes
router.use("/message", messageRoutes); // All routes under "/auth" will be handled by authRoutes

export default router;
 