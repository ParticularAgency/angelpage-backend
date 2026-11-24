import { Router } from "express";
import authRoutes from "../api/auth/auth.routes";
import adminRoutes from "../api/admin/admin.routes";
import charityRoutes from "../api/charities/charities.routes";
import userRoutes from "../api/users/users.routes";
import favoritesRoutes from "../api/favorites/favorites.routes";
import storefrontRoutes from "../api/storefront/storefront.routes";
import productsRoutes from "../api/products/products.routes";
import cartRoutes from "../api/cart/cart.routes";
import orderRoutes from "../api/orders/orders.routes";
import emailRoutes from "../api/email/email.routes";
import searchRoutes from "../api/Search/search.routes";
import notificationRoutes from "../api/notifications/notifications.routes";
import messageRoutes from "../api/messages/messages.routes";
import dashboardRoutes from "../api/dashboard/dashboard.routes";
import blogRoutes from "../api/blog/blog.routes";
import eventsRoutes from "../api/events/events.routes";
import webhooksRoutes from "../api/webhooks/webhooks.routes";
import affiliateRoutes from "../api/affiliate/affiliate.routes.js";
import socialRoutes from "../api/social/socialPosts.routes.js";
import aiRoutes from "../api/ai/ai.routes.js";
import galleryRoutes from "../api/gallery/gallery.routes.js";
import categoriesRoutes from "../api/categories/categories.routes.js";

const router = Router();

router.get("/health", (req, res) => {
	res.status(200).json({ message: "Server is running" });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/charity", charityRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/storefront", storefrontRoutes);
router.use("/products", productsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/cart", cartRoutes);
router.use("/order", orderRoutes);
router.use("/email", emailRoutes);
router.use("/search", searchRoutes);
router.use("/notification", notificationRoutes);
router.use("/message", messageRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/blog", blogRoutes);
router.use("/events", eventsRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/affiliate", affiliateRoutes);
router.use("/social", socialRoutes);
router.use("/ai", aiRoutes);
router.use("/gallery", galleryRoutes);

export default router;
