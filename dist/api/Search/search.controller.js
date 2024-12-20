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
exports.getSearchSuggestions = void 0;
const Product_model_1 = __importDefault(require("../../models/Product.model")); // Replace with your Product model
const Charity_model_1 = __importDefault(require("../../models/Charity.model")); // Replace with your Charity model
const getSearchSuggestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Invalid query parameter" });
    }
    try {
        // Search for products by name, category, subcategory, or brand
        const products = yield Product_model_1.default.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
                { subcategory: { $regex: query, $options: "i" } },
                { brand: { $regex: query, $options: "i" } },
            ],
        }).select("_id name category subcategory brand");
        // Search for charities by charityName, storefrontId, or charityID
        const charities = yield Charity_model_1.default.find({
            $or: [
                { charityName: { $regex: query, $options: "i" } },
                { storefrontId: { $regex: query, $options: "i" } },
                { charityID: { $regex: query, $options: "i" } },
            ],
        }).select("charityName storefrontId charityID");
        // Combine product and charity results
        const suggestions = [
            ...products.map(product => ({
                id: product._id,
                name: product.name,
                category: product.category,
                subcategory: product.subcategory,
                brand: product.brand,
                type: "Product",
            })),
            ...charities.map(charity => ({
                id: charity.charityID,
                storefrontId: charity.storefrontId,
                name: charity.charityName,
                type: "Charity",
            })),
        ];
        res.status(200).json(suggestions);
    }
    catch (error) {
        console.error("Error fetching search suggestions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSearchSuggestions = getSearchSuggestions;
