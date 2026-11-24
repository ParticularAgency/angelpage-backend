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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const productImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    altText: { type: String, default: "" },
});
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: false },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    selectedCharityName: { type: String, required: false },
    selectedCharityId: { type: String, required: false },
    additionalInfo: { type: String, required: false },
    price: { type: Number, required: false },
    charityProfit: { type: Number, required: false },
    sellerSharePercent: { type: Number, default: 0, min: 0, max: 100 },
    sellerProfit: { type: Number, required: false },
    fulfillmentType: {
        type: String,
        enum: ["uk_shipping", "personal_delivery", "self_collect", "local_only"],
        default: "uk_shipping",
    },
    sellAreas: { type: [String], default: [] },
    category: { type: String, required: false },
    subcategory: { type: String, required: false },
    condition: { type: String, required: false },
    brand: { type: String, required: false },
    material: { type: String, required: false },
    color: { type: String, required: false },
    weight: { type: String, required: false },
    size: { type: String, required: false },
    dimensions: {
        type: {
            height: { type: String, default: "" },
            width: { type: String, default: "" },
            depth: { type: String, default: "" },
        },
        default: {},
    },
    images: {
        type: [productImageSchema],
        validate: [arrayLimit, "Maximum of 10 images are allowed."],
    },
    videos: {
        type: [productImageSchema],
        default: [],
    },
    quantity: { type: Number, default: 1, min: 1 },
    stockRemaining: { type: Number, default: 1, min: 0 },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: false },
    charity: { type: mongoose_1.Schema.Types.ObjectId, ref: "Charity", required: false },
    status: {
        type: String,
        enum: ["DRAFT", "PENDING_REVIEW", "LIVE", "REMOVED"],
        default: "DRAFT",
        required: false,
    },
    isArchived: { type: Boolean, default: false },
    ebayItemId: { type: String },
    ebayOfferId: { type: String },
    ebayAffiliateUrl: { type: String },
    affiliateUrl: { type: String },
    affiliatePartnerId: { type: String },
    shopifyProductId: { type: String },
    wooCommerceProductId: { type: String },
    externalProductUrl: { type: String },
    externalProductId: { type: String },
    source: {
        type: String,
        enum: [
            "angelpage",
            "ebay_sync",
            "ebay_affiliate",
            "shopify_sync",
            "woocommerce_sync",
            "scrape_sync",
        ],
        default: "angelpage",
    },
    checkoutMode: {
        type: String,
        enum: ["stripe", "ebay_redirect", "affiliate_redirect"],
        default: "stripe",
    },
    isPromoted: { type: Boolean, default: false },
    socialPosting: {
        facebook: { type: Boolean, default: true },
        instagram: { type: Boolean, default: true },
        tiktok: { type: Boolean, default: false },
        tiktokVideoUrl: { type: String, default: "" },
    },
}, { timestamps: true });
// Helper function to validate the number of images
function arrayLimit(val) {
    return val.length <= 10;
}
exports.default = mongoose_1.default.model("Product", productSchema);
