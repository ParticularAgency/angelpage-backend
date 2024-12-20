import { Request, Response } from "express";
import Cart from "../../models/Cart.model";

// Add product to cart// Add or Update Product Quantity in Cart
export const addProductOnCart = async (req: Request, res: Response) => {
	const { userId, productId, quantity } = req.body;

	try {
		let cart = await Cart.findOne({ userId });

		if (!cart) {
			// Create new cart if none exists for the user
			cart = new Cart({
				userId,
				items: [{ productId, quantity: quantity || 1 }],
			});
		} else {
			const itemIndex = cart.items.findIndex(
				item => item.productId.toString() === productId,
			);

			if (itemIndex > -1) {
				// Update quantity if product already exists
				cart.items[itemIndex].quantity += quantity;
				if (cart.items[itemIndex].quantity < 1) {
					// Remove item if quantity drops below 1
					cart.items.splice(itemIndex, 1);
				}
			} else {
				// Add new product if it doesn't exist in cart
				cart.items.push({ productId, quantity: quantity || 1 });
			}
		}

		await cart.save();
		res.status(200).json({ message: "Cart updated successfully", cart });
	} catch (error) {
		console.error("Error adding product to cart:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// Get all products in the cart
export const getProductOnCart = async (req: Request, res: Response) => {
	try {
		const cart = await Cart.findOne({ userId: req.params.userId })
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
	} catch (error) {
		console.error("Error fetching cart:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// Remove product from cart
export const removeProductOnCart = async (req: Request, res: Response) => {
	const { userId, productId } = req.body; // Expect `productId` to be a string

	try {
		const cart = await Cart.findOne({ userId });
		if (!cart) {
			return res.status(404).json({ error: "Cart not found" });
		}

		// Ensure that we compare the stringified `_id` properly
		cart.items = cart.items.filter(
			item => item.productId.toString() !== productId,
		);

		await cart.save();
		res
			.status(200)
			.json({ message: "Product removed from cart successfully", cart });
	} catch (error) {
		console.error("Error removing product from cart:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// Clear all products from cart
export const clearProductOnCart = async (req: Request, res: Response) => {
	const { userId } = req.body;

	try {
		const cart = await Cart.findOne({ userId });
		if (!cart) {
			return res.status(404).json({ error: "Cart not found" });
		}

		cart.items = [];
		await cart.save();
		res.status(200).json({ message: "Cart cleared successfully", cart });
	} catch (error) {
		console.error("Error clearing cart:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
