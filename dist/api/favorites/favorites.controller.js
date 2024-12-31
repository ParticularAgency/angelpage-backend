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
exports.getFavoriteCount = exports.getFavorites = exports.toggleFavorite = void 0;
const Favorite_model_1 = __importDefault(require("../../models/Favorite.model"));
const Product_model_1 = __importDefault(require("../../models/Product.model")); // Ensure Product model is imported
const Charity_model_1 = __importDefault(require("../../models/Charity.model")); // Ensure Charity model is imported
const Notification_model_1 = __importDefault(require("../../models/Notification.model"));
const toggleFavorite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || req.body.userId; // Ensure userId is derived
    const { itemId, type } = req.body;
    console.log("Received Request Data:", { userId, itemId, type }); // Debugging log
    if (!userId || !itemId || !type) {
        return res
            .status(400)
            .json({ message: "userId, itemId, and type are required." });
    }
    try {
        let favorite = yield Favorite_model_1.default.findOne({ user: userId });
        let actionType; // Define whether this is a mark or unmark action
        if (!favorite) {
            // Create a new favorite entry if it doesn't exist
            favorite = new Favorite_model_1.default({ user: userId, items: [{ itemId, type }] });
            actionType = "MARK";
        }
        else {
            const existingIndex = favorite.items.findIndex((item) => item.itemId === itemId && item.type === type);
            if (existingIndex > -1) {
                // Remove if the item already exists (toggle off)
                favorite.items.splice(existingIndex, 1);
                actionType = "UNMARK";
            }
            else {
                // Add if the item doesn't exist (toggle on)
                favorite.items.push({ itemId, type });
                actionType = "MARK";
            }
        }
        const product = yield Product_model_1.default.findById(itemId).populate("seller charity");
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        const { seller, charity, name, images } = product;
        // Determine sellerType and recipient details
        let sellerType = null;
        let recipientId = null;
        if (seller) {
            sellerType = "USER";
            recipientId = seller._id;
        }
        else if (charity) {
            sellerType = "CHARITY";
            recipientId = charity._id;
        }
        if (!sellerType || !recipientId) {
            return res
                .status(400)
                .json({ message: "Product seller details are missing." });
        }
        yield favorite.save();
        // Return updated favorite items to keep frontend in sync
        const updatedFavorites = yield Favorite_model_1.default.findOne({ user: userId });
        // Trigger notification for the seller or charity
        const notificationPayload = {
            recipientId,
            recipientType: sellerType,
            notificationType: "FAVORITE_MARKED",
            message: actionType === "MARK"
                ? `Your product "${name}" has been marked as a favorite!`
                : `Your product "${name}" has been unmarked as a favorite!`,
            metadata: {
                productId: itemId,
                productImage: images === null || images === void 0 ? void 0 : images[0], // Assuming images is an array
            },
            isRead: false,
        };
        console.log("Notification Payload:", notificationPayload);
        yield Notification_model_1.default.create(notificationPayload);
        res.status(200).json({
            message: actionType === "MARK"
                ? "Product marked as favorite successfully"
                : "Product unmarked as favorite successfully",
            favorite: updatedFavorites,
        });
    }
    catch (error) {
        console.error("Error toggling favorite:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.toggleFavorite = toggleFavorite;
// export const toggleFavorite = async (req, res) => {
// 	const userId = req.user?._id || req.body.userId;
// 	const { itemId, type } = req.body;
// 	if (!userId || !itemId || !type) {
// 		return res
// 			.status(400)
// 			.json({ message: "userId, itemId, and type are required." });
// 	}
// 	try {
// 		let favorite = await Favorite.findOne({ user: userId });
// 		const product = await Product.findById(itemId).populate("seller charity");
// 		if (!product) {
// 			return res.status(404).json({ message: "Product not found." });
// 		}
// 		const { seller, charity, name, images } = product;
// 		const sellerType = seller ? "USER" :  "CHARITY";
// 		if (!seller || !sellerType) {
// 			return res
// 				.status(400)
// 				.json({ message: "Product seller details are missing." });
// 		}
// 		if (!favorite) {
// 			favorite = new Favorite({ user: userId, items: [{ itemId, type }] });
// 		} else {
// 			const existingIndex = favorite.items.findIndex(
// 				(item) => item.itemId === itemId && item.type === type
// 			);
// 			if (existingIndex > -1) {
// 				favorite.items.splice(existingIndex, 1);
// 			} else {
// 				favorite.items.push({ itemId, type });
// 			}
// 		}
// 		await favorite.save();
// 		//  Return updated favorite items to keep frontend in sync
// 		const updatedFavorites = await Favorite.findOne({ user: userId });
// 		// Trigger notification for the seller
// 		const notificationPayload = {
// 			recipientId: seller._id || charity._id,
// 			recipientType: sellerType,
// 			notificationType: "FAVORITE_MARKED",
// 			message: `Your product "${name}" has been marked as a favorite!`,
// 			metadata: {
// 				productId: itemId,
// 				productImage: images?.[0], // Assuming images is an array
// 			},
// 		};
// 		console.log("Notification Payload:", notificationPayload);
// 		await Notification.create(notificationPayload);
// 		res.status(200).json({
// 			message: "Favorite toggled successfully",
// 			favorite: updatedFavorites,
// 		});
// 	} catch (error) {
// 		console.error("Error toggling favorite:", error);
// 		res.status(500).json({ message: "Internal server error", error });
// 	}
// };
// // Toggle favorite (add/remove)
// export const toggleFavorite = async (req, res) => {
// 	const userId = req.user?._id || req.body.userId; // Ensure userId is derived
// 	const { itemId, type } = req.body;
// 	console.log("Received Request Data:", { userId, itemId, type }); // Debugging log
// 	if (!userId || !itemId || !type) {
// 		return res
// 			.status(400)
// 			.json({ message: "userId, itemId, and type are required." });
// 	}
// 	try {
// 		let favorite = await Favorite.findOne({ user: userId });
// 		if (!favorite) {
// 			// Create a new favorite entry if it doesn't exist
// 			favorite = new Favorite({ user: userId, items: [{ itemId, type }] });
// 		} else {
// 			const existingIndex = favorite.items.findIndex(
// 				item => item.itemId === itemId && item.type === type,
// 			);
// 			if (existingIndex > -1) {
// 				// Remove if the item already exists (toggle off)
// 				favorite.items.splice(existingIndex, 1);
// 			} else {
// 				// Add if the item doesn't exist (toggle on)
// 				favorite.items.push({ itemId, type });
// 			}
// 		}
// 		await favorite.save();
// 		// Return updated favorite items to keep frontend in sync
// 		const updatedFavorites = await Favorite.findOne({ user: userId });
// 		res.status(200).json({
// 			message: "Favorite toggled successfully",
// 			favorite: updatedFavorites,
// 		});
// 	} catch (error) {
// 		console.error("Error toggling favorite:", error);
// 		res.status(500).json({ message: "Internal server error", error });
// 	}
// };
// Get user's favorite items
const getFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // Ensure req.user is populated
    if (!userId) {
        console.error("User ID is missing in the request");
        return res
            .status(401)
            .json({ message: "Unauthorized access. User not authenticated." });
    }
    try {
        const favorite = yield Favorite_model_1.default.findOne({ user: userId });
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
        const favoriteProducts = yield Product_model_1.default.find({ _id: { $in: productIds } })
            .select("name price images category subcategory dimensions status brand material size seller charity")
            .populate("seller", "firstName lastName profileImage addresses")
            .populate("charity", "charityName charityID storefrontId listedProducts profileImage addresses")
            .sort({ createdAt: -1 });
        // Fetch charity details with populated fields
        const favoriteCharities = yield Charity_model_1.default.find({ _id: { $in: charityIds } })
            .select("charityName charityID description storefrontId profileImage addresses")
            .populate("listedProducts")
            .sort({ createdAt: -1 });
        // Add address and other details for each product
        const itemsWithAddress = favoriteProducts.map(item => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, item.toObject()), { seller: {
                    firstName: (_a = item.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = item.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = item.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = item.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Use the first address
                }, charity: {
                    charityName: (_f = item.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = item.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = item.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = item.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
                } }));
        });
        // Format the response
        res.status(200).json({
            favoriteProducts: itemsWithAddress,
            favoriteCharities,
        });
    }
    catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getFavorites = getFavorites;
const getFavoriteCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        return res
            .status(401)
            .json({ message: "Unauthorized access. User not authenticated." });
    }
    try {
        const favorite = yield Favorite_model_1.default.findOne({ user: userId });
        const favoriteCount = favorite ? favorite.items.length : 0;
        res.status(200).json({ favoriteCount });
    }
    catch (error) {
        console.error("Error fetching favorite count:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getFavoriteCount = getFavoriteCount;
