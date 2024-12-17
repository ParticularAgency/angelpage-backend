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
exports.getListingProducts = exports.getProductDetails = exports.getRoleBasedListings = exports.getRelatedProducts = exports.getProductsByLatest = exports.getCategoryProducts = exports.getProductsByCategory = exports.getAllProducts = exports.deleteProduct = exports.archiveProduct = exports.editProduct = exports.createProduct = void 0;
// import { Request, Response } from "express";
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
// Create a new product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, price, charityProfit, category, charity, additionalInfo, subcategory, condition, brand, material, color, size, dimensions, selectedCharityName, selectedCharityId, status, } = req.body;
    const { userId, role } = req.user;
    try {
        if (!name || !price || !category) {
            return res
                .status(400)
                .json({ message: "Name, price, and category are required." });
        }
        // Parse dimensions if it's a string
        let parsedDimensions = null;
        if (dimensions) {
            if (typeof dimensions === "string") {
                try {
                    parsedDimensions = JSON.parse(dimensions);
                }
                catch (err) {
                    return res.status(400).json({
                        message: "Invalid dimensions format. It must be a valid JSON object.",
                    });
                }
            }
            else if (typeof dimensions === "object") {
                parsedDimensions = dimensions;
            }
            else {
                return res.status(400).json({
                    message: "Invalid dimensions format. It must be an object or a JSON string.",
                });
            }
        }
        // Handle file uploads if provided
        const images = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const result = yield cloudinary_1.default.uploader.upload(file.path, {
                    folder: "products",
                });
                images.push({ url: result.secure_url, altText: name || "" });
            }
        }
        // Determine the charity association based on the role
        let charityId = null;
        if (role === "USER") {
            if (!charity && status !== "DRAFT") {
                return res
                    .status(400)
                    .json({ message: "Charity is required for USER role." });
            }
            charityId = charity || null;
        }
        else if (role === "CHARITY") {
            charityId = userId;
        }
        // Create a new product
        const newProduct = new Product_model_1.default({
            name,
            price,
            charityProfit,
            category,
            charity: charityId,
            additionalInfo,
            subcategory,
            condition,
            brand,
            material,
            color,
            size,
            dimensions: parsedDimensions,
            selectedCharityName,
            selectedCharityId,
            seller: userId,
            images,
            status: status || "DRAFT",
            isArchived: false,
        });
        const savedProduct = yield newProduct.save();
        // Add the product to the respective user or charity's listedProducts
        const model = role === "USER" ? User_model_1.default : Charity_model_1.default;
        yield model.findByIdAndUpdate(userId, {
            $push: { listedProducts: savedProduct._id },
        });
        // If the product is associated with a selected charity, add it to their listedProducts
        if (selectedCharityId) {
            yield Charity_model_1.default.findByIdAndUpdate(selectedCharityId, {
                $push: { listedProducts: savedProduct._id },
            });
        }
        return res.status(201).json({
            message: "Product created successfully",
            product: savedProduct,
        });
    }
    catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ message: "Failed to create product." });
    }
});
exports.createProduct = createProduct;
// Edit a product
const editProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId } = req.params;
    const updates = req.body;
    try {
        const updatedProduct = yield Product_model_1.default.findByIdAndUpdate(productId, updates, {
            new: true,
        });
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found." });
        }
        return res.status(200).json({
            message: "Product updated successfully.",
            product: updatedProduct,
        });
    }
    catch (error) {
        console.error("Error editing product:", error);
        return res.status(500).json({ message: "Failed to update product." });
    }
});
exports.editProduct = editProduct;
// Archive (soft delete) a product
const archiveProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId } = req.params;
    try {
        const archivedProduct = yield Product_model_1.default.findByIdAndUpdate(productId, { isArchived: true }, { new: true });
        if (!archivedProduct) {
            return res.status(404).json({ message: "Product not found." });
        }
        return res.status(200).json({
            message: "Product archived successfully.",
            product: archivedProduct,
        });
    }
    catch (error) {
        console.error("Error archiving product:", error);
        return res.status(500).json({ message: "Failed to archive product." });
    }
});
exports.archiveProduct = archiveProduct;
// Permanently delete a product
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId } = req.params;
    try {
        const deletedProduct = yield Product_model_1.default.findByIdAndDelete(productId);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found." });
        }
        // Remove product reference from the respective user/charity
        yield User_model_1.default.updateMany({ listedProducts: productId }, { $pull: { listedProducts: productId } });
        yield Charity_model_1.default.updateMany({ listedProducts: productId }, { $pull: { listedProducts: productId } });
        return res.status(200).json({ message: "Product deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ message: "Failed to delete product." });
    }
});
exports.deleteProduct = deleteProduct;
// Fetch all products (public access)
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { isArchived } = req.query; // Optional query to handle archived state
    try {
        const query = {}; // Initialize query object
        if (isArchived !== undefined) {
            query.isArchived = isArchived === "true"; // Handle archived filter
        }
        else {
            query.isArchived = false; // Default to showing only active products
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage addresses")
            .populate("charity", "charityName charityID profileImage")
            .sort({ createdAt: -1 }); // Sort by creation date (newest first)
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching all products:", error);
        return res.status(500).json({ message: "Failed to fetch all products." });
    }
});
exports.getAllProducts = getAllProducts;
// Fetch products by category (public access)
const getProductsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category } = req.params; // Extract category from the URL params
    const { isArchived } = req.query; // Optional query to handle archived state
    try {
        const query = { category }; // Base query to filter by category
        if (isArchived !== undefined) {
            query.isArchived = isArchived === "true"; // Handle archived filter
        }
        else {
            query.isArchived = false; // Default to showing only active products
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage  addresses")
            .populate("charity", "charityName charityID profileImage")
            .sort({ createdAt: -1 }); // Sort products by the latest creation date
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found for this category." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching products by category:", error);
        return res.status(500).json({ message: "Failed to fetch products by category." });
    }
});
exports.getProductsByCategory = getProductsByCategory;
// Fetch products by category or subcategory (public access)
const getCategoryProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category, subcategory } = req.query; // Extract category and subcategory from query parameters
    const { isArchived } = req.query; // Optional query to handle archived state
    try {
        const query = {}; // Initialize query object
        if (category)
            query.category = category; // Add category to the query if provided
        if (subcategory)
            query.subcategory = subcategory; // Add subcategory to the query if provided
        if (isArchived !== undefined) {
            query.isArchived = isArchived === "true"; // Handle archived filter
        }
        else {
            query.isArchived = false; // Default to showing only active products
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage addresses")
            .populate("charity", "charityName charityID profileImage")
            .sort({ createdAt: -1 }); // Sort by creation date (newest first)
        if (!products || products.length === 0) {
            return res
                .status(404)
                .json({ message: "No products found for the selected category." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching category products:", error);
        return res.status(500).json({ message: "Failed to fetch category products." });
    }
});
exports.getCategoryProducts = getCategoryProducts;
// Fetch latest 10 products (public access)
const getProductsByLatest = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_model_1.default.find({ isArchived: false })
            .populate("seller", "firstName lastName userName profileImage addresses")
            .populate("charity", "charityName charityID profileImage")
            .sort({ createdAt: -1 })
            .limit(10);
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching latest products:", error);
        return res.status(500).json({ message: "Failed to fetch latest products." });
    }
});
exports.getProductsByLatest = getProductsByLatest;
// Controller for fetching related products
const getRelatedProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category } = req.query;
    try {
        const products = yield Product_model_1.default.find({ category, isArchived: false })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('charity', 'charityName profileImage');
        if (!products.length) {
            return res.status(404).json({ message: 'No related products found.' });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (err) {
        console.error('Error fetching related products:', err);
        res.status(500).json({ message: 'Failed to fetch related products.' });
    }
});
exports.getRelatedProducts = getRelatedProducts;
// Get role-based product listings (USER or CHARITY)
const getRoleBasedListings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, role } = req.user;
    try {
        let products;
        if (role === "USER") {
            products = yield Product_model_1.default.find({ seller: userId, isArchived: false });
        }
        else if (role === "CHARITY") {
            products = yield Product_model_1.default.find({
                $or: [{ seller: userId }, { charity: userId }],
                isArchived: false,
            });
        }
        else {
            return res.status(403).json({ message: "Access denied. Invalid role." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching role-based listings:", error);
        return res.status(500).json({ message: "Failed to fetch listings." });
    }
});
exports.getRoleBasedListings = getRoleBasedListings;
// Get Product Details (Public Access)
const getProductDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const { productId } = req.params;
    try {
        // Fetch product details by ID, including populated fields for seller and charity
        const product = yield Product_model_1.default.findById(productId)
            .populate("seller", "firstName lastName profileImage  addresses")
            .populate("charity", "charityName charityID storefrontId profileImage");
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        // Return product details with charity and seller info
        return res.status(200).json({
            product: {
                id: product._id,
                name: product.name,
                additionalInfo: product.additionalInfo,
                price: product.price,
                charityProfit: product.charityProfit,
                description: product.additionalInfo,
                images: product.images,
                category: product.category,
                subcategory: product.subcategory,
                condition: product.condition,
                brand: product.brand,
                material: product.material,
                color: product.color,
                size: product.size,
                dimensions: {
                    height: ((_a = product.dimensions) === null || _a === void 0 ? void 0 : _a.height) || null,
                    width: ((_b = product.dimensions) === null || _b === void 0 ? void 0 : _b.width) || null,
                    depth: ((_c = product.dimensions) === null || _c === void 0 ? void 0 : _c.depth) || null,
                },
                createdAt: product.createdAt,
                charity: {
                    charityName: (_d = product.charity) === null || _d === void 0 ? void 0 : _d.charityName,
                    charityID: (_e = product.charity) === null || _e === void 0 ? void 0 : _e.charityID,
                    storefrontId: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.storefrontId,
                    profileImage: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.profileImage,
                },
                seller: {
                    firstName: (_h = product.seller) === null || _h === void 0 ? void 0 : _h.firstName,
                    lastName: (_j = product.seller) === null || _j === void 0 ? void 0 : _j.lastName,
                    profileImage: (_k = product.seller) === null || _k === void 0 ? void 0 : _k.profileImage,
                    address: (_m = (_l = product.seller) === null || _l === void 0 ? void 0 : _l.addresses) === null || _m === void 0 ? void 0 : _m[0],
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching product details:", error);
        return res
            .status(500)
            .json({ message: "Failed to fetch product details." });
    }
});
exports.getProductDetails = getProductDetails;
const getListingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, role } = req.user; // Extract userId and role from the authenticated request
    const { status, isArchived } = req.query; // Optional filters for status and archived state
    try {
        const query = {
            seller: userId, // Only fetch products posted by the current user/charity
        };
        if (status)
            query.status = status; // Filter by status (e.g., DRAFT or LIVE)
        if (isArchived !== undefined)
            query.isArchived = isArchived === "true"; // Handle archived filter
        // For CHARITY, also include products where the charity is explicitly associated
        if (role === "CHARITY") {
            query.$or = [{ seller: userId }, { charity: userId }];
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage  addresses")
            .populate("charity", "charityName charityID profileImage")
            .sort({ createdAt: -1 }); // Sort by latest created products
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching user products:", error);
        res.status(500).json({ message: "Failed to fetch user products." });
    }
});
exports.getListingProducts = getListingProducts;
