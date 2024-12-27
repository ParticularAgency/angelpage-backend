"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("./cart.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Add product to cart
router.post("/add-product-to-cart", (0, auth_middleware_1.authMiddleware)(), cart_controller_1.addProductOnCart);
// Get all products in the cart for a user
router.get("/:userId", (0, auth_middleware_1.authMiddleware)(), cart_controller_1.getProductOnCart);
router.post("/remove", (0, auth_middleware_1.authMiddleware)(), cart_controller_1.removeProductOnCart);
// Clear all products from the cart
router.post("/clear", (0, auth_middleware_1.authMiddleware)(), cart_controller_1.clearProductOnCart);
router.post("/update-quantity", (0, auth_middleware_1.authMiddleware)(), cart_controller_1.updateQuantityInCart);
exports.default = router;
