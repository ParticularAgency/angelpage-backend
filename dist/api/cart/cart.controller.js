"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearProductOnCart = exports.removeProductOnCart = exports.getProductOnCart = exports.addProductOnCart = void 0;
const Cart_model_1 = __importDefault(require("../../models/Cart.model"));
// Add product to cart// Add or Update Product Quantity in Cart
const addProductOnCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, productId, quantity } = req.body;
    try {
        let cart = yield Cart_model_1.default.findOne({ userId });
        if (!cart) {
            // Create new cart if none exists for the user
            cart = new Cart_model_1.default({
                userId,
                items: [{ productId, quantity: quantity || 1 }],
            });
        }
        else {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex > -1) {
                // Update quantity if product already exists
                cart.items[itemIndex].quantity += quantity;
                if (cart.items[itemIndex].quantity < 1) {
                    // Remove item if quantity drops below 1
                    cart.items.splice(itemIndex, 1);
                }
            }
            else {
                // Add new product if it doesn't exist in cart
                cart.items.push({ productId, quantity: quantity || 1 });
            }
        }
        yield cart.save();
        res.status(200).json({ message: "Cart updated successfully", cart });
    }
    catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.addProductOnCart = addProductOnCart;
// Get all products in the cart
const getProductOnCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cart = yield Cart_model_1.default.findOne({ userId: req.params.userId })
            .populate({
            path: "items.productId",
            populate: {
                path: "seller",
                select: "firstName lastName userName profileImage addresses",
            },
        })
            .populate({
            path: "items.productId",
            populate: {
                path: "charity",
                select: "charityName charityID profileImage  addresses",
            },
        });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        res.status(200).json({ cart });
    }
    catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getProductOnCart = getProductOnCart;
// Remove product from cart
const removeProductOnCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, productId } = req.body; // Expect `productId` to be a string
    try {
        const cart = yield Cart_model_1.default.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        // Ensure that we compare the stringified `_id` properly
        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        yield cart.save();
        res
            .status(200)
            .json({ message: "Product removed from cart successfully", cart });
    }
    catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.removeProductOnCart = removeProductOnCart;
// Clear all products from cart
const clearProductOnCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        const cart = yield Cart_model_1.default.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        cart.items = [];
        yield cart.save();
        res.status(200).json({ message: "Cart cleared successfully", cart });
    }
    catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.clearProductOnCart = clearProductOnCart;
