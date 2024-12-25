"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("./orders.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Create a new order
router.post("/create", orders_controller_1.createOrder);
router.get("/seller/:sellerId/orders", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getAllOrdersForSeller);
// Get orders for a specific user
router.get("/user/:userId", orders_controller_1.getOrdersByUser);
// Get sold items for a specific seller
router.get("/seller/:sellerId/sold", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getSoldItems);
router.get("/buyer/:buyerId/orders", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getPurchaseItems);
router.get("/:orderId", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getOrderById);
router.patch("/:orderId/shipped", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.updateOrderStatusToShipped);
router.patch("/:orderId/delivered", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.updateOrderStatusToDelivered);
// Get total sold items
router.get("/items/sold", orders_controller_1.getTotalSoldItems);
// Get buyer purchases
router.get("/buyer/:buyerId/purchases", orders_controller_1.getBuyerPurchases);
// router.get("/carriers", getCarriers);
// router.get("/carriers/:carrierId/services", getCarrierServices);
// router.post("/pickups", schedulePickup);
// router.post("/shipments", generateTrackingNumber);
exports.default = router;
