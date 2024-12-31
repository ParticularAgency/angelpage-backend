import { Router } from "express";
import {
	createOrder,
	getCarriers,
	// getPackages,
	getServices,
	// trackPackage,
	// schedulePickup,
	// getLabel,
	// updateTrackingStatus,
	getOrdersByUser,
	getSoldItems,
	getPurchaseItems,
	getTotalSoldItems,
	getBuyerPurchases,
	// getCarrierServices,
	// getCarrierPackages,
	getCurretnUserSoldItems,
	getCurrentUserPurchaseItems,
	getRates,
	createLabelForOrder,
	getTotalSalesStats,
	getOrderById,
	updateOrderStatusToDelivered,
	getAllOrdersForSeller,
	updateOrderStatusToShipped,
} from "./orders.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Create a new order
router.post("/create", createOrder);

// creat label for order endpoint
router.post("/orders/get-shipping-rate", getRates);

router.post("/orders/:orderId/createlabel", createLabelForOrder);

router.get("/carrier", getCarriers);

// Route to get services for a specific carrier
router.get("/carriers/:carrierCode/services", getServices);

// Route to get packages for a specific carrier 
// router.get("/carriers/:carrierCode/packages", getPackages);

router.get("/seller/:sellerId/orders", authMiddleware(), getAllOrdersForSeller);

// Get orders for a specific user
router.get("/user/:userId", getOrdersByUser);

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
router.get("/admin/sales-total", getTotalSalesStats);

// Get buyer purchases
router.get("/buyer/:buyerId/purchases", getBuyerPurchases);


// router.get("/carriers/:carrierId/services", getCarrierServices);
// router.post("/pickups", schedulePickup);

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


export default router;
