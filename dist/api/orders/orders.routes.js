"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("./orders.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Create a new order
router.post("/create", orders_controller_1.createOrder);
router.post("/guest-create", orders_controller_1.createGuestOrder);
router.get("/guest-confirmation/:orderId", orders_controller_1.getGuestOrderConfirmation);
// creat label for order endpoint
router.post("/orders/get-shipping-rate", orders_controller_1.getRates);
router.post("/orders/:orderId/createlabel", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.createLabelForOrder);
router.get("/carrier", orders_controller_1.getCarriers);
// Route to get services for a specific carrier
router.get("/carriers/:carrierCode/services", orders_controller_1.getServices);
// Route to get packages for a specific carrier 
router.get("/carriers/:carrierCode/packages", orders_controller_1.getPackages);
router.get("/seller/:sellerId/orders", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getAllOrdersForSeller);
// Get orders for a specific user
router.get("/user/:userId", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getOrdersByUser);
// Get sold items for a specific seller
router.get("/seller/:sellerId/sold", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getSoldItems);
router.get("/buyer/:buyerId/orders", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getPurchaseItems);
router.get("/:orderId", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getOrderById);
router.patch("/:orderId/shipped", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.updateOrderStatusToShipped);
router.patch("/:orderId/delivered", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.updateOrderStatusToDelivered);
// Get total sold items
router.get("/items/sold", orders_controller_1.getTotalSoldItems);
// get admin view total sales and reveniue states
router.get("/admin/sales-total", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), orders_controller_1.getTotalSalesStats);
router.get("/admin/failed-payments", (0, auth_middleware_1.authMiddleware)(["ADMIN"]), orders_controller_1.getFailedPaymentOrders);
// Get buyer purchases
router.get("/buyer/:buyerId/purchases", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getBuyerPurchases);
// // Cancel order and delete from ShipStation
// router.patch("/orders/:orderId/delete", cancelOrder);
// // Permanently delete order from the database
router.get("/orders/:orderId/track", orders_controller_1.orderTracking);
router.get("/users/:sellerId/dashboard-sales-analytics", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getCurretnUserSoldItems);
router.get("/users/:buyerId/dashboard-purchase-analytics", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.getCurrentUserPurchaseItems);
// Optional auth — guest checkout has no token; logged-in buyers/sellers must match
router.post("/update-order-status", (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) {
        return (0, auth_middleware_1.authMiddleware)()(req, res, next);
    }
    next();
}, orders_controller_1.updateOrderStatus);
router.post("/:orderId/dispute", (0, auth_middleware_1.authMiddleware)(), orders_controller_1.openOrderDispute);
exports.default = router;
