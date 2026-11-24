"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const scheduledPostSchema = new mongoose_1.default.Schema({
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
    },
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, required: true, index: true },
    platforms: {
        type: [String],
        enum: ["facebook", "instagram", "tiktok", "twitter"],
        default: ["facebook", "instagram"],
    },
    scheduledFor: { type: Date, required: true, index: true },
    caption: { type: String, default: "" },
    status: {
        type: String,
        enum: ["scheduled", "processing", "completed", "failed", "cancelled"],
        default: "scheduled",
    },
    jobId: { type: String },
    error: { type: String, default: "" },
}, { timestamps: true });
exports.default = mongoose_1.default.model("ScheduledPost", scheduledPostSchema);
