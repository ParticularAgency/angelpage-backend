"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreateProducts = exports.getEbayAffiliateFeed = exports.setProductPromoted = exports.searchSuggest = exports.updateProductSocialPosting = exports.reviewProduct = exports.getPendingReviewProducts = exports.getRoleBasedListings = exports.deleteProduct = exports.getDraftProducts = exports.relistProduct = exports.archiveProduct = exports.editProduct = exports.getListingProducts = exports.getProductDetails = exports.getRelatedProducts = exports.getProductsByLatest = exports.getCategoryProducts = exports.getProductsByCategory = exports.getAllProducts = exports.createProduct = void 0;
// import { Request, Response } from "express";
const Product_model_1 = __importDefault(require("../../models/Product.model"));
const charityAccess_js_1 = require("../../utils/charityAccess.js");
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const socialPosting_service_js_1 = require("../../services/socialPosting.service.js");
const socialPosts_controller_js_1 = require("../../api/social/socialPosts.controller.js");
const productReviews_controller_js_1 = require("./productReviews.controller.js");
const marketingJourneys_service_js_1 = require("../../services/marketingJourneys.service.js");
const notifyCharity_1 = require("../../utils/notifyCharity");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const productSlug_js_1 = require("../../utils/productSlug.js");
const profitSplit_js_1 = require("../../utils/profitSplit.js");
const parseSellAreas = (raw) => {
    if (!raw)
        return [];
    if (Array.isArray(raw))
        return raw.map(String).filter(Boolean);
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed.map(String).filter(Boolean);
        }
        catch (_a) {
            /* comma-separated */
        }
        return raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
};
const parseFulfillmentType = (value) => {
    const allowed = ["uk_shipping", "personal_delivery", "self_collect", "local_only"];
    return allowed.includes(value) ? value : "uk_shipping";
};
// Create a new product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { name, price, charityProfit, category, charity, additionalInfo, subcategory, condition, brand, material, color, size, weight, dimensions, selectedCharityName, selectedCharityId, status, quantity, socialPosting, sellerSharePercent, fulfillmentType, sellAreas, } = req.body;
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
        // Handle file uploads (images + optional videos)
        const images = [];
        const videos = [];
        const imageFiles = ((_a = req.files) === null || _a === void 0 ? void 0 : _a.images)
            ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
            : Array.isArray(req.files)
                ? req.files
                : [];
        const videoFiles = ((_b = req.files) === null || _b === void 0 ? void 0 : _b.videos)
            ? (Array.isArray(req.files.videos) ? req.files.videos : [req.files.videos])
            : [];
        for (const file of imageFiles) {
            const result = yield cloudinary_1.default.uploader.upload(file.path, {
                folder: "products",
            });
            images.push({ url: result.secure_url, altText: name || "" });
        }
        for (const file of videoFiles) {
            const result = yield cloudinary_1.default.uploader.upload(file.path, {
                folder: "products/videos",
                resource_type: "video",
            });
            videos.push({ url: result.secure_url, altText: name || "" });
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
        const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
        const requestedStatus = status || "DRAFT";
        let finalStatus = requestedStatus;
        if (requestedStatus === "LIVE") {
            finalStatus = "PENDING_REVIEW";
        }
        const slug = yield (0, productSlug_js_1.buildUniqueProductSlug)(name);
        const numericPrice = parseFloat(price);
        const sharePct = Math.min(100, Math.max(0, parseFloat(sellerSharePercent) || 0));
        const split = (0, profitSplit_js_1.calculateProfitSplit)(numericPrice, sharePct);
        const resolvedFulfillment = parseFulfillmentType(fulfillmentType);
        const resolvedAreas = parseSellAreas(sellAreas);
        if (resolvedFulfillment === "local_only" && resolvedAreas.length === 0) {
            return res.status(400).json({
                message: "Add at least one area for local-only listings.",
            });
        }
        if (resolvedFulfillment === "uk_shipping" &&
            finalStatus !== "DRAFT" &&
            (!weight || !(parsedDimensions === null || parsedDimensions === void 0 ? void 0 : parsedDimensions.height) || !(parsedDimensions === null || parsedDimensions === void 0 ? void 0 : parsedDimensions.width))) {
            return res.status(400).json({
                message: "Weight and package dimensions are required for UK shipping listings.",
            });
        }
        // Create a new product
        const newProduct = new Product_model_1.default({
            name,
            slug,
            price,
            charityProfit: split.charityProfit,
            sellerSharePercent: sharePct,
            sellerProfit: split.sellerProfit,
            fulfillmentType: resolvedFulfillment,
            sellAreas: resolvedAreas,
            category,
            charity: charityId,
            additionalInfo,
            subcategory,
            condition,
            brand,
            material,
            color,
            size,
            weight,
            dimensions: parsedDimensions,
            selectedCharityName,
            selectedCharityId,
            seller: userId,
            images,
            videos,
            quantity: parsedQuantity,
            stockRemaining: parsedQuantity,
            status: finalStatus,
            isArchived: false,
            socialPosting: (0, socialPosting_service_js_1.parseSocialPostingInput)(socialPosting),
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
        if (selectedCharityId && finalStatus === "LIVE") {
            const sellerProfile = role === "USER"
                ? yield User_model_1.default.findById(userId).select("firstName lastName")
                : yield Charity_model_1.default.findById(userId).select("charityName firstName");
            const sellerName = role === "CHARITY"
                ? sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.charityName
                : `${(sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.firstName) || ""} ${(sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.lastName) || ""}`.trim();
            yield (0, notifyCharity_1.notifyCharityNewListing)({
                charityId: selectedCharityId,
                productId: savedProduct._id,
                productName: name,
                sellerName,
            });
        }
        return res.status(201).json({
            message: finalStatus === "PENDING_REVIEW"
                ? "Product submitted for admin review. It will go live once approved."
                : "Product created successfully",
            product: savedProduct,
        });
    }
    catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ message: "Failed to create product." });
    }
});
exports.createProduct = createProduct;
// Fetch all products (public access)
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { isArchived, status, promoted } = req.query;
    try {
        const query = Object.assign({}, (status ? { status } : { status: "LIVE" }));
        if (promoted === "true") {
            query.isPromoted = true;
        }
        if (isArchived !== undefined) {
            query.isArchived = isArchived === "true"; // Handle archived filter
        }
        else {
            query.isArchived = false;
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName profileImage addresses charityName")
            .populate("charity", "charityName charityID profileImage addresses")
            .sort({ createdAt: -1 });
        if (!products || products.length === 0) {
            return res.status(200).json({ products: [] });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0],
                }, charity: {
                    charityName: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = product.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
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
    const { category } = req.params;
    const { isArchived, status } = req.query;
    try {
        const query = Object.assign(Object.assign({ category }, (isArchived !== undefined && { isArchived: isArchived === 'true' })), (status && { status }));
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage  addresses charityName")
            .populate("charity", "charityName charityID profileImage   addresses")
            .sort({ createdAt: -1 }); // Sort products by the latest creation date
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found for this category." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                }, charity: {
                    charityName: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = product.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
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
    const { isArchived, status } = req.query; // Optional query to handle archived state
    try {
        const query = Object.assign({}, (status && { status })); // Initialize query object
        const exact = value => ({
            $regex: `^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
        });
        if (category)
            query.category = exact(category);
        if (subcategory)
            query.subcategory = exact(subcategory);
        if (isArchived !== undefined) {
            query.isArchived = isArchived === "true"; // Handle archived filter
        }
        else {
            query.isArchived = false; // Default to showing only active products
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage  addresses charityName")
            .populate("charity", "charityName charityID profileImage   addresses")
            .sort({ createdAt: -1 }); // Sort by creation date (newest first)
        if (!products || products.length === 0) {
            return res.status(200).json({ products: [] });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                }, charity: {
                    charityName: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = product.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
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
        const products = yield Product_model_1.default.find({ isArchived: false, status: "LIVE" })
            .populate("seller", "firstName lastName userName profileImage  addresses charityName")
            .populate("charity", "charityName charityID profileImage   addresses")
            .sort({ createdAt: -1 })
            .limit(10);
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found." });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0],
                }, charity: {
                    charityName: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = product.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
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
        const products = yield Product_model_1.default.find({ category, isArchived: false, status: "LIVE" })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('charity', 'charityName profileImage');
        if (!products.length) {
            return res.status(404).json({ message: 'No related products found.' });
        }
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0], // Include default address
                }, charity: {
                    charityName: (_f = product.charity) === null || _f === void 0 ? void 0 : _f.charityName,
                    charityID: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityID,
                    profileImage: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.profileImage,
                    address: (_k = (_j = product.charity) === null || _j === void 0 ? void 0 : _j.addresses) === null || _k === void 0 ? void 0 : _k[0],
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
// Get Product Details (Public Access)
const getProductDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    const { productId } = req.params;
    try {
        const product = yield Product_model_1.default.findOne((0, productSlug_js_1.resolveProductLookup)(productId))
            .populate("seller", "_id firstName lastName charityName email profileImage  addresses")
            .populate("charity", "charityName email charityID storefrontId profileImage  addresses");
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        const resolvedId = product._id.toString();
        // Determine the seller type
        let sellerType = null;
        if (product.seller) {
            sellerType = "USER";
        }
        else if (product.charity) {
            sellerType = "CHARITY";
        }
        // Return product details with charity and seller info
        const reviewSummary = yield (0, productReviews_controller_js_1.getReviewSummaryForProduct)(resolvedId);
        return res.status(200).json({
            product: {
                id: product._id,
                slug: product.slug,
                name: product.name,
                additionalInfo: product.additionalInfo,
                price: product.price,
                charityProfit: product.charityProfit,
                sellerSharePercent: (_a = product.sellerSharePercent) !== null && _a !== void 0 ? _a : 0,
                sellerProfit: (_b = product.sellerProfit) !== null && _b !== void 0 ? _b : 0,
                fulfillmentType: product.fulfillmentType || "uk_shipping",
                sellAreas: product.sellAreas || [],
                description: product.additionalInfo,
                images: product.images,
                videos: product.videos || [],
                checkoutMode: product.checkoutMode || "stripe",
                ebayItemId: product.ebayItemId,
                ebayAffiliateUrl: product.ebayAffiliateUrl ||
                    (product.ebayItemId
                        ? `https://www.ebay.co.uk/itm/${product.ebayItemId}${process.env.EBAY_CAMPAIGN_ID
                            ? `?campid=${process.env.EBAY_CAMPAIGN_ID}&customid=angelpage`
                            : ""}`
                        : null),
                isPromoted: product.isPromoted || false,
                socialPosting: product.socialPosting,
                reviewSummary,
                category: product.category,
                subcategory: product.subcategory,
                condition: product.condition,
                brand: product.brand,
                material: product.material,
                color: product.color,
                size: product.size,
                status: product.status,
                weight: product.weight,
                dimensions: {
                    height: ((_c = product.dimensions) === null || _c === void 0 ? void 0 : _c.height) || null,
                    width: ((_d = product.dimensions) === null || _d === void 0 ? void 0 : _d.width) || null,
                    depth: ((_e = product.dimensions) === null || _e === void 0 ? void 0 : _e.depth) || null,
                },
                createdAt: product.createdAt,
                charity: {
                    id: (_f = product.charity) === null || _f === void 0 ? void 0 : _f._id,
                    charityName: (_g = product.charity) === null || _g === void 0 ? void 0 : _g.charityName,
                    charityID: (_h = product.charity) === null || _h === void 0 ? void 0 : _h.charityID,
                    storefrontId: (_j = product.charity) === null || _j === void 0 ? void 0 : _j.storefrontId,
                    profileImage: (_k = product.charity) === null || _k === void 0 ? void 0 : _k.profileImage,
                    address: (_m = (_l = product.charity) === null || _l === void 0 ? void 0 : _l.addresses) === null || _m === void 0 ? void 0 : _m[0],
                },
                sellerType,
                seller: {
                    id: ((_o = product.seller) === null || _o === void 0 ? void 0 : _o._id) || ((_p = product.charity) === null || _p === void 0 ? void 0 : _p._id),
                    firstName: (_q = product.seller) === null || _q === void 0 ? void 0 : _q.firstName,
                    lastName: (_r = product.seller) === null || _r === void 0 ? void 0 : _r.lastName,
                    charityName: (_s = product.charity) === null || _s === void 0 ? void 0 : _s.charityName,
                    profileImage: ((_t = product.seller) === null || _t === void 0 ? void 0 : _t.profileImage) || ((_u = product.charity) === null || _u === void 0 ? void 0 : _u.profileImage),
                    address: ((_w = (_v = product.seller) === null || _v === void 0 ? void 0 : _v.addresses) === null || _w === void 0 ? void 0 : _w[0]) || ((_y = (_x = product.charity) === null || _x === void 0 ? void 0 : _x.addresses) === null || _y === void 0 ? void 0 : _y[0]),
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
    const { userId, role } = req.user;
    const { status, isArchived } = req.query;
    try {
        const query = {
            seller: userId,
        };
        if (status)
            query.status = status; // Filter by status (e.g., DRAFT or LIVE)
        if (isArchived !== undefined)
            query.isArchived = isArchived === "true";
        if (role === "CHARITY") {
            query.$or = [{ seller: userId }, { charity: userId }];
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName userName profileImage  addresses")
            .populate("charity", "charityName charityID profileImage addresses")
            .sort({ createdAt: -1 });
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, product.toObject()), { seller: {
                    firstName: (_a = product.seller) === null || _a === void 0 ? void 0 : _a.firstName,
                    lastName: (_b = product.seller) === null || _b === void 0 ? void 0 : _b.lastName,
                    profileImage: (_c = product.seller) === null || _c === void 0 ? void 0 : _c.profileImage,
                    address: (_e = (_d = product.seller) === null || _d === void 0 ? void 0 : _d.addresses) === null || _e === void 0 ? void 0 : _e[0],
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
// Edit a product
const editProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isCharity = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "CHARITY";
        const product = yield Product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Verify ownership
        const isOwner = isCharity
            ? ((_c = product.charity) === null || _c === void 0 ? void 0 : _c.toString()) === userId
            : ((_d = product.seller) === null || _d === void 0 ? void 0 : _d.toString()) === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "Unauthorized to edit this product" });
        }
        // Allow edits for `DRAFT` or `LIVE` only
        if (product.isArchived) {
            return res.status(400).json({ message: "Cannot edit archived products" });
        }
        const _f = req.body, { socialPosting, sellerSharePercent, fulfillmentType, sellAreas } = _f, rest = __rest(_f, ["socialPosting", "sellerSharePercent", "fulfillmentType", "sellAreas"]);
        Object.assign(product, rest);
        if (sellerSharePercent !== undefined) {
            product.sellerSharePercent = Math.min(100, Math.max(0, parseFloat(sellerSharePercent) || 0));
        }
        if (fulfillmentType !== undefined) {
            product.fulfillmentType = parseFulfillmentType(fulfillmentType);
        }
        if (sellAreas !== undefined) {
            product.sellAreas = parseSellAreas(sellAreas);
        }
        if (product.price != null) {
            const split = (0, profitSplit_js_1.calculateProfitSplit)(product.price, (_e = product.sellerSharePercent) !== null && _e !== void 0 ? _e : 0);
            product.charityProfit = split.charityProfit;
            product.sellerProfit = split.sellerProfit;
        }
        if (rest.name && rest.name !== product.name) {
            product.slug = yield (0, productSlug_js_1.buildUniqueProductSlug)(rest.name, product._id);
        }
        if (socialPosting !== undefined) {
            product.socialPosting = (0, socialPosting_service_js_1.parseSocialPostingInput)(socialPosting);
        }
        yield product.save();
        res.status(200).json({ message: "Product updated successfully", product });
    }
    catch (error) {
        console.error("Error editing product:", error);
        res.status(500).json({ message: "Failed to edit product" });
    }
});
exports.editProduct = editProduct;
// Archive (soft delete) a product
const archiveProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isCharity = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "CHARITY";
        const product = yield Product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const isOwner = isCharity
            ? ((_c = product.charity) === null || _c === void 0 ? void 0 : _c.toString()) === userId
            : ((_d = product.seller) === null || _d === void 0 ? void 0 : _d.toString()) === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "Unauthorized to archive this product" });
        }
        product.status = "REMOVED";
        product.isArchived = true;
        yield product.save();
        res.status(200).json({ message: "Product archived successfully", product });
    }
    catch (error) {
        console.error("Error archiving product:", error);
        res.status(500).json({ message: "Failed to archive product" });
    }
});
exports.archiveProduct = archiveProduct;
// Re-list an archived or sold product
const relistProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isCharity = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "CHARITY";
        const { quantity } = req.body;
        const product = yield Product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const isOwner = isCharity
            ? ((_c = product.charity) === null || _c === void 0 ? void 0 : _c.toString()) === userId
            : ((_d = product.seller) === null || _d === void 0 ? void 0 : _d.toString()) === userId;
        if (!isOwner) {
            return res.status(403).json({ message: "Unauthorized to re-list this product" });
        }
        const parsedQuantity = Math.max(1, parseInt(quantity, 10) || product.quantity || 1);
        product.isArchived = false;
        product.status = "PENDING_REVIEW";
        product.quantity = parsedQuantity;
        product.stockRemaining = parsedQuantity;
        yield product.save();
        res.status(200).json({
            message: "Product submitted for admin review before going live",
            product,
        });
    }
    catch (error) {
        console.error("Error re-listing product:", error);
        res.status(500).json({ message: "Failed to re-list product" });
    }
});
exports.relistProduct = relistProduct;
const getDraftProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isCharity = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "CHARITY";
        const query = isCharity
            ? { charity: userId, status: "DRAFT", isArchived: false }
            : { seller: userId, status: "DRAFT", isArchived: false };
        const products = yield Product_model_1.default.find(query);
        res.status(200).json({ products });
    }
    catch (error) {
        console.error("Error fetching draft products:", error);
        res.status(500).json({ message: "Failed to fetch draft products" });
    }
});
exports.getDraftProducts = getDraftProducts;
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
// Get role-based product listings (USER or CHARITY)
const getRoleBasedListings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, role } = req.user;
    const { status, isArchived } = req.query;
    try {
        const query = {
            isArchived: isArchived === "true" ? true : false,
        };
        if (role === "USER") {
            query.seller = userId;
        }
        else if ((0, charityAccess_js_1.isCharityAccountRole)(role)) {
            const charityId = (0, charityAccess_js_1.resolveCharityId)(req.user);
            query.$or = [{ charity: charityId }, { seller: charityId }];
        }
        else {
            return res.status(403).json({ message: "Access denied. Invalid role." });
        }
        if (status) {
            query.status = status; // Filter by status if provided
        }
        const products = yield Product_model_1.default.find(query)
            .populate("seller", "firstName lastName profileImage addresses")
            .populate("charity", "charityName profileImage addresses")
            .sort({ createdAt: -1 });
        const productsWithAddress = products.map(product => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            return (Object.assign(Object.assign({}, product.toObject()), { id: product._id, name: product.name, additionalInfo: product.additionalInfo, price: product.price, charityProfit: product.charityProfit, description: product.additionalInfo, selectedCharityName: product.selectedCharityName, selectedCharityId: product.selectedCharityId, images: product.images, category: product.category, subcategory: product.subcategory, condition: product.condition, brand: product.brand, material: product.material, color: product.color, size: product.size, status: product.status, socialPosting: product.socialPosting, videos: product.videos, dimensions: {
                    height: ((_a = product.dimensions) === null || _a === void 0 ? void 0 : _a.height) || null,
                    width: ((_b = product.dimensions) === null || _b === void 0 ? void 0 : _b.width) || null,
                    depth: ((_c = product.dimensions) === null || _c === void 0 ? void 0 : _c.depth) || null,
                }, createdAt: product.createdAt, seller: {
                    firstName: (_d = product.seller) === null || _d === void 0 ? void 0 : _d.firstName,
                    lastName: (_e = product.seller) === null || _e === void 0 ? void 0 : _e.lastName,
                    profileImage: (_f = product.seller) === null || _f === void 0 ? void 0 : _f.profileImage,
                    address: (_h = (_g = product.seller) === null || _g === void 0 ? void 0 : _g.addresses) === null || _h === void 0 ? void 0 : _h[0], // Include default address
                }, charity: {
                    charityName: (_j = product.charity) === null || _j === void 0 ? void 0 : _j.charityName,
                    charityID: (_k = product.charity) === null || _k === void 0 ? void 0 : _k.charityID,
                    profileImage: (_l = product.charity) === null || _l === void 0 ? void 0 : _l.profileImage,
                    address: (_o = (_m = product.charity) === null || _m === void 0 ? void 0 : _m.addresses) === null || _o === void 0 ? void 0 : _o[0],
                } }));
        });
        return res.status(200).json({ products: productsWithAddress });
    }
    catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ message: "Failed to fetch listings." });
    }
});
exports.getRoleBasedListings = getRoleBasedListings;
const getPendingReviewProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_model_1.default.find({ status: "PENDING_REVIEW", isArchived: false })
            .populate("seller", "firstName lastName email profileImage")
            .populate("charity", "charityName email profileImage")
            .sort({ createdAt: -1 });
        return res.status(200).json({ products });
    }
    catch (error) {
        console.error("Error fetching pending products:", error);
        return res.status(500).json({ message: "Failed to fetch pending products." });
    }
});
exports.getPendingReviewProducts = getPendingReviewProducts;
const reviewProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { action, reason, socialPosting } = req.body;
        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: "Action must be approve or reject." });
        }
        const product = yield Product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        if (product.status !== "PENDING_REVIEW") {
            return res.status(400).json({ message: "Product is not pending review." });
        }
        if (action === "approve") {
            if (socialPosting !== undefined) {
                product.socialPosting = (0, socialPosting_service_js_1.parseSocialPostingInput)(socialPosting);
            }
            product.status = "LIVE";
            yield product.save();
            if (product.selectedCharityId) {
                const sellerProfile = product.seller
                    ? yield User_model_1.default.findById(product.seller).select("firstName lastName")
                    : yield Charity_model_1.default.findById(product.charity).select("charityName");
                const sellerName = (sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.charityName)
                    ? sellerProfile.charityName
                    : `${(sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.firstName) || ""} ${(sellerProfile === null || sellerProfile === void 0 ? void 0 : sellerProfile.lastName) || ""}`.trim();
                yield (0, notifyCharity_1.notifyCharityNewListing)({
                    charityId: product.selectedCharityId,
                    productId: product._id,
                    productName: product.name,
                    sellerName,
                });
            }
            (0, socialPosts_controller_js_1.queueAutoPostNewListing)(product).catch((err) => console.error("Social auto-post queue failed:", err));
            if (product.seller) {
                const seller = yield User_model_1.default.findById(product.seller).select("email firstName");
                if (seller === null || seller === void 0 ? void 0 : seller.email) {
                    (0, marketingJourneys_service_js_1.fireMarketingEvent)(marketingJourneys_service_js_1.JOURNEY_EVENTS.PRODUCT_APPROVED, {
                        email: seller.email,
                        productId: product._id.toString(),
                        productName: product.name,
                        firstName: seller.firstName,
                    });
                }
            }
            return res.status(200).json({ message: "Product approved and is now live.", product });
        }
        product.status = "DRAFT";
        if (reason) {
            product.additionalInfo = `${product.additionalInfo || ""}\n\n[Admin rejection]: ${reason}`.trim();
        }
        yield product.save();
        return res.status(200).json({ message: "Product rejected and returned to draft.", product });
    }
    catch (error) {
        console.error("Error reviewing product:", error);
        return res.status(500).json({ message: "Failed to review product." });
    }
});
exports.reviewProduct = reviewProduct;
const updateProductSocialPosting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isCharity = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === "CHARITY";
        const product = yield Product_model_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const isOwner = isCharity
            ? ((_c = product.charity) === null || _c === void 0 ? void 0 : _c.toString()) === userId
            : ((_d = product.seller) === null || _d === void 0 ? void 0 : _d.toString()) === userId;
        const isAdmin = (0, productReviews_controller_js_1.isAdminUser)((_e = req.user) === null || _e === void 0 ? void 0 : _e.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized to update this product" });
        }
        product.socialPosting = (0, socialPosting_service_js_1.parseSocialPostingInput)(req.body);
        yield product.save();
        return res.status(200).json({
            message: "Social posting preferences updated",
            socialPosting: product.socialPosting,
            product,
        });
    }
    catch (error) {
        console.error("Error updating social posting preferences:", error);
        return res.status(500).json({ message: "Failed to update social posting preferences." });
    }
});
exports.updateProductSocialPosting = updateProductSocialPosting;
const searchSuggest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q = "", limit = 8 } = req.query;
        if (!q || String(q).trim().length < 2) {
            return res.status(200).json({ suggestions: [] });
        }
        const regex = new RegExp(String(q).trim(), "i");
        const products = yield Product_model_1.default.find({
            status: "LIVE",
            isArchived: false,
            $or: [{ name: regex }, { brand: regex }, { category: regex }],
        })
            .select("name brand category price images slug")
            .limit(Number(limit));
        res.status(200).json({ suggestions: products });
    }
    catch (error) {
        res.status(500).json({ message: "Search suggest failed." });
    }
});
exports.searchSuggest = searchSuggest;
const setProductPromoted = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { isPromoted } = req.body;
        if (typeof isPromoted !== "boolean") {
            return res.status(400).json({ message: "isPromoted boolean required." });
        }
        const product = yield Product_model_1.default.findByIdAndUpdate(productId, { isPromoted }, { new: true });
        if (!product)
            return res.status(404).json({ message: "Product not found." });
        res.status(200).json({ message: "Promoted status updated.", product });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update promoted status." });
    }
});
exports.setProductPromoted = setProductPromoted;
const getEbayAffiliateFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fetchEbayCuratedFeed } = yield Promise.resolve().then(() => __importStar(require("../../services/ebayAffiliate.service.js")));
        const { limit, offset } = req.query;
        const items = yield fetchEbayCuratedFeed({
            limit: parseInt(limit, 10) || 50,
            offset: parseInt(offset, 10) || 0,
        });
        return res.status(200).json({ items });
    }
    catch (error) {
        console.error("eBay affiliate feed error:", error);
        return res.status(500).json({ message: error.message || "Failed to fetch eBay affiliate feed." });
    }
});
exports.getEbayAffiliateFeed = getEbayAffiliateFeed;
const bulkCreateProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { products: items, status: requestedBulkStatus = "PENDING_REVIEW" } = req.body;
    const { userId, role } = req.user;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "A products array is required." });
    }
    if (items.length > 50) {
        return res.status(400).json({ message: "Maximum 50 products per bulk upload." });
    }
    const { CHARITY_SHARE_RATE } = yield Promise.resolve().then(() => __importStar(require("../../constants/platformPolicy.js")));
    const created = [];
    const failed = [];
    let charityId = null;
    if (role === "CHARITY") {
        charityId = userId;
    }
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            const { name, price, category, charity, subcategory, condition, brand, quantity } = item;
            if (!name || price == null || !category) {
                throw new Error("name, price, and category are required");
            }
            const numericPrice = parseFloat(price);
            if (Number.isNaN(numericPrice) || numericPrice < 1) {
                throw new Error("price must be at least 1");
            }
            const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
            let itemCharityId = charityId;
            if (role === "USER") {
                if (!charity && requestedBulkStatus !== "DRAFT") {
                    throw new Error("charity is required for USER listings");
                }
                itemCharityId = charity || null;
            }
            let finalStatus = requestedBulkStatus;
            if (finalStatus === "LIVE") {
                finalStatus = "PENDING_REVIEW";
            }
            const charityProfit = item.charityProfit != null
                ? parseFloat(item.charityProfit)
                : numericPrice * CHARITY_SHARE_RATE;
            const product = new Product_model_1.default({
                name,
                slug: yield (0, productSlug_js_1.buildUniqueProductSlug)(name),
                price: numericPrice,
                charityProfit,
                category,
                subcategory: subcategory || "",
                condition: condition || "",
                brand: brand || "",
                charity: itemCharityId,
                seller: userId,
                quantity: parsedQuantity,
                stockRemaining: parsedQuantity,
                status: finalStatus,
                isArchived: false,
                images: [],
                additionalInfo: item.additionalInfo || "",
            });
            const saved = yield product.save();
            const model = role === "USER" ? User_model_1.default : Charity_model_1.default;
            yield model.findByIdAndUpdate(userId, {
                $push: { listedProducts: saved._id },
            });
            created.push(saved);
        }
        catch (err) {
            failed.push({ row: i + 1, name: item === null || item === void 0 ? void 0 : item.name, error: err.message });
        }
    }
    return res.status(201).json({
        message: `${created.length} product(s) submitted. ${failed.length} failed.`,
        createdCount: created.length,
        failedCount: failed.length,
        created,
        failed,
    });
});
exports.bulkCreateProducts = bulkCreateProducts;
