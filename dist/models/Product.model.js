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
    selectedCharityName: { type: String, required: false },
    selectedCharityId: { type: String, required: false },
    additionalInfo: { type: String, required: false },
    price: { type: Number, required: false },
    charityProfit: { type: Number, required: false },
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
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: false },
    charity: { type: mongoose_1.Schema.Types.ObjectId, ref: "Charity", required: false },
    status: {
        type: String,
        enum: ["DRAFT", "LIVE", "REMOVED"],
        default: "DRAFT",
        required: false,
    },
    isArchived: { type: Boolean, default: false },
}, { timestamps: true });
// Helper function to validate the number of images
function arrayLimit(val) {
    return val.length <= 10;
}
exports.default = mongoose_1.default.model("Product", productSchema);
