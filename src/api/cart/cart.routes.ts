import { Router } from "express";
import {
	addProductOnCart,
	getProductOnCart,
	removeProductOnCart,
	clearProductOnCart,
} from "./cart.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// Add product to cart
router.post("/add-product-to-cart", authMiddleware(), addProductOnCart);

// Get all products in the cart for a user
router.get("/:userId", authMiddleware(), getProductOnCart);

router.post("/remove", authMiddleware(), removeProductOnCart);

// Clear all products from the cart
router.post("/clear", authMiddleware(), clearProductOnCart);

export default router;
