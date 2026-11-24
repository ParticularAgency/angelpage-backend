"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const socialPostLogSchema = new mongoose_1.default.Schema({
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Product",
        index: true,
    },
    galleryItemId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "GalleryItem",
        index: true,
    },
    contentType: {
        type: String,
        enum: ["product", "gallery_item"],
        default: "product",
    },
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, index: true },
    platform: {
        type: String,
        enum: ["facebook", "instagram", "tiktok", "twitter"],
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "success", "failed", "skipped"],
        default: "pending",
    },
    trigger: {
        type: String,
        enum: ["auto", "manual", "admin", "scheduled"],
        default: "auto",
    },
    scheduledFor: { type: Date },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: "" },
    response: { type: mongoose_1.default.Schema.Types.Mixed },
}, { timestamps: true });
exports.default = mongoose_1.default.model("SocialPostLog", socialPostLogSchema);
