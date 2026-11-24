import { Router } from "express";
import {
	createOrder,
	createGuestOrder,
	getGuestOrderConfirmation,
	getCarriers,
	getPackages,
	getServices,
	// cancelOrder,
	// deleteOrderPermanently,
	getOrdersByUser,
	getSoldItems,
	getPurchaseItems,
	getTotalSoldItems,
	getBuyerPurchases,
	orderTracking,
	updateOrderStatus,
	getCurretnUserSoldItems,
	getCurrentUserPurchaseItems,
	getRates,
	createLabelForOrder,
	getTotalSalesStats,
	getFailedPaymentOrders,
	getOrderById,
	updateOrderStatusToDelivered,
	getAllOrdersForSeller,
	updateOrderStatusToShipped,
	openOrderDispute,
} from "./orders.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Create a new order
router.post("/create", createOrder);
router.post("/guest-create", createGuestOrder);
router.get("/guest-confirmation/:orderId", getGuestOrderConfirmation);

// creat label for order endpoint
router.post("/orders/get-shipping-rate", getRates);

router.post("/orders/:orderId/createlabel", authMiddleware(), createLabelForOrder);

router.get("/carrier", getCarriers);

// Route to get services for a specific carrier
router.get("/carriers/:carrierCode/services", getServices);

// Route to get packages for a specific carrier 
router.get("/carriers/:carrierCode/packages", getPackages);

router.get("/seller/:sellerId/orders", authMiddleware(), getAllOrdersForSeller);

// Get orders for a specific user
router.get("/user/:userId", authMiddleware(), getOrdersByUser);

// Get sold items for a specific seller
router.get("/seller/:sellerId/sold", authMiddleware(), getSoldItems);
router.get("/buyer/:buyerId/orders", authMiddleware(), getPurchaseItems);
router.get("/:orderId", authMiddleware(), getOrderById);


router.patch(
	"/:orderId/shipped",
	authMiddleware(),
	updateOrderStatusToShipped,
); 
router.patch(
	"/:orderId/delivered", 
	authMiddleware(),
	updateOrderStatusToDelivered,
);


// Get total sold items
router.get("/items/sold", getTotalSoldItems);


// get admin view total sales and reveniue states
router.get("/admin/sales-total", authMiddleware(["ADMIN"]), getTotalSalesStats);
router.get("/admin/failed-payments", authMiddleware(["ADMIN"]), getFailedPaymentOrders);

// Get buyer purchases
router.get("/buyer/:buyerId/purchases", authMiddleware(), getBuyerPurchases);


// // Cancel order and delete from ShipStation
// router.patch("/orders/:orderId/delete", cancelOrder);

// // Permanently delete order from the database
router.get("/orders/:orderId/track", orderTracking);


router.get(
	"/users/:sellerId/dashboard-sales-analytics",
	authMiddleware(),
	getCurretnUserSoldItems,
);
router.get(
	"/users/:buyerId/dashboard-purchase-analytics",
	authMiddleware(),
	getCurrentUserPurchaseItems,
);
// Optional auth — guest checkout has no token; logged-in buyers/sellers must match
router.post("/update-order-status", (req, res, next) => {
	const authHeader = req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authMiddleware()(req, res, next);
	}
	next();
}, updateOrderStatus);
router.post("/:orderId/dispute", authMiddleware(), openOrderDispute);


export default router;
