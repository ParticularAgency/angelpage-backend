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
// Toggle favorite (add/remove)
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
        if (!favorite) {
            // Create a new favorite entry if it doesn't exist
            favorite = new Favorite_model_1.default({ user: userId, items: [{ itemId, type }] });
        }
        else {
            const existingIndex = favorite.items.findIndex(item => item.itemId === itemId && item.type === type);
            if (existingIndex > -1) {
                // Remove if the item already exists (toggle off)
                favorite.items.splice(existingIndex, 1);
            }
            else {
                // Add if the item doesn't exist (toggle on)
                favorite.items.push({ itemId, type });
            }
        }
        yield favorite.save();
        // Return updated favorite items to keep frontend in sync
        const updatedFavorites = yield Favorite_model_1.default.findOne({ user: userId });
        res
            .status(200)
            .json({
            message: "Favorite toggled successfully",
            favorite: updatedFavorites,
        });
    }
    catch (error) {
        console.error("Error toggling favorite:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.toggleFavorite = toggleFavorite;
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
        const favoriteProducts = favorite.items
            .filter(item => item.type === "Product")
            .map(item => item.itemId);
        const favoriteCharities = favorite.items
            .filter(item => item.type === "Charity")
            .map(item => item.itemId);
        res.status(200).json({ favoriteProducts, favoriteCharities });
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
