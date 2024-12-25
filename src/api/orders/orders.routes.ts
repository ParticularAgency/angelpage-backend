import { Router } from "express";
import {
	createOrder,
	// getCarriers,
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
	// schedulePickup,
	// getCarriers,
	// getCarrierServices,
	// generateTrackingNumber,
	getOrderById,
	updateOrderStatusToDelivered,
	getAllOrdersForSeller,
	updateOrderStatusToShipped,
} from "./orders.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Create a new order
router.post("/create", createOrder);

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

// Get buyer purchases
router.get("/buyer/:buyerId/purchases", getBuyerPurchases);


// router.get("/carriers", getCarriers);
// router.get("/carriers/:carrierId/services", getCarrierServices);
// router.post("/pickups", schedulePickup);
// router.post("/shipments", generateTrackingNumber);


export default router;
