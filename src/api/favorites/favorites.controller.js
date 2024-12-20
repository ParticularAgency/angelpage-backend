
import Favorite from "../../models/Favorite.model";
import Product from "../../models/Product.model"; // Ensure Product model is imported
import Charity from "../../models/Charity.model"; // Ensure Charity model is imported


// Toggle favorite (add/remove)
export const toggleFavorite = async (req, res) => {
	const userId = req.user?._id || req.body.userId; // Ensure userId is derived
	const { itemId, type } = req.body;

	console.log("Received Request Data:", { userId, itemId, type }); // Debugging log

	if (!userId || !itemId || !type) {
		return res
			.status(400)
			.json({ message: "userId, itemId, and type are required." });
	}

	try {
		let favorite = await Favorite.findOne({ user: userId });

		if (!favorite) {
			// Create a new favorite entry if it doesn't exist
			favorite = new Favorite({ user: userId, items: [{ itemId, type }] });
		} else {
			const existingIndex = favorite.items.findIndex(
				item => item.itemId === itemId && item.type === type,
			);

			if (existingIndex > -1) {
				// Remove if the item already exists (toggle off)
				favorite.items.splice(existingIndex, 1);
			} else {
				// Add if the item doesn't exist (toggle on)
				favorite.items.push({ itemId, type });
			}
		}

		await favorite.save();

		// Return updated favorite items to keep frontend in sync
		const updatedFavorites = await Favorite.findOne({ user: userId });
		res.status(200).json({
			message: "Favorite toggled successfully",
			favorite: updatedFavorites,
		});
	} catch (error) {
		console.error("Error toggling favorite:", error);
		res.status(500).json({ message: "Internal server error", error });
	}
};

// Get user's favorite items
export const getFavorites = async (req, res) => {
	const userId = req.user?.userId; // Ensure req.user is populated

	if (!userId) {
		console.error("User ID is missing in the request");
		return res
			.status(401)
			.json({ message: "Unauthorized access. User not authenticated." });
	}

	try {
		const favorite = await Favorite.findOne({ user: userId });
		console.log("Fetched Favorites:", favorite); // Debug log

		if (!favorite) {
			return res
				.status(200)
				.json({ favoriteProducts: [], favoriteCharities: [] });
		}

		const productIds = favorite.items
			.filter(item => item.type === "Product")
			.map(item => item.itemId);
		const charityIds = favorite.items
			.filter(item => item.type === "Charity")
			.map(item => item.itemId);
		// Fetch product details with populated fields
		const favoriteProducts = await Product.find({ _id: { $in: productIds } })
			.select(
				"name price images category subcategory dimensions status brand material size seller charity",
			)
			.populate("seller", "firstName lastName profileImage addresses")
			.populate(
				"charity",
				"charityName charityID storefrontId listedProducts profileImage addresses",
			)
			.sort({ createdAt: -1 });

		// Fetch charity details with populated fields
		const favoriteCharities = await Charity.find({ _id: { $in: charityIds } })
			.select(
				"charityName charityID description storefrontId profileImage addresses",
			)
			.populate("listedProducts")
			.sort({ createdAt: -1 });

		// Add address and other details for each product
		const itemsWithAddress = favoriteProducts.map(item => ({
			...item.toObject(),
			seller: {
				firstName: item.seller?.firstName,
				lastName: item.seller?.lastName,
				profileImage: item.seller?.profileImage,
				address: item.seller?.addresses?.[0], // Use the first address
			},
			charity: {
				charityName: item.charity?.charityName,
				charityID: item.charity?.charityID,
				profileImage: item.charity?.profileImage,
				address: item.charity?.addresses?.[0],
			},
		}));

		// Format the response
		res.status(200).json({
			favoriteProducts: itemsWithAddress,
			favoriteCharities,
		});
	} catch (error) {
		console.error("Error fetching favorites:", error);
		res.status(500).json({ message: "Internal server error", error });
	}
};

export const getFavoriteCount = async (req, res) => {
	const userId = req.user?._id;

	if (!userId) {
		return res
			.status(401)
			.json({ message: "Unauthorized access. User not authenticated." });
	}

	try {
		const favorite = await Favorite.findOne({ user: userId });
		const favoriteCount = favorite ? favorite.items.length : 0;

		res.status(200).json({ favoriteCount });
	} catch (error) {
		console.error("Error fetching favorite count:", error);
		res.status(500).json({ message: "Internal server error", error });
	}
};