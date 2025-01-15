"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MessageSchema = new mongoose_1.default.Schema({
    conversationId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        refPath: "senderType",
    },
    senderType: {
        type: String,
        enum: ["User", "Charity"],
        required: true,
    },
    recipient: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        refPath: "recipientType",
    },
    recipientType: {
        type: String,
        enum: ["User", "Charity"],
        required: true,
    },
    content: { type: String, required: true },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    createdAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model("Message", MessageSchema);
