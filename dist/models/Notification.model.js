"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    recipientId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        refPath: "recipientType",
    },
    recipientType: {
        type: String,
        enum: ["USER", "CHARITY", "ADMIN"],
        required: true,
    },
    notificationType: {
        type: String,
        enum: [
            "FAVORITE_MARKED",
            "PRODUCT_PURCHASED",
            "PRODUCT_SHIPPED",
            "PRODUCT_DELIVERED",
            "PRODUCT_ASSIGNED_TO_CHARITY",
            "NEW_PRODUCT_POSTED",
            "PRODUCT_SOLD_SUCCESS",
            "ESCROW_HOLD",
            "ESCROW_RELEASED",
            "PAYMENT_RELEASE",
        ],
        required: true,
    },
    message: { type: String, required: true },
    metadata: { type: Object },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Notification", notificationSchema);
