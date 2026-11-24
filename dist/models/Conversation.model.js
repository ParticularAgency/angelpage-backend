"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const ConversationSchema = new Schema({
    participants: [
        {
            participantId: {
                type: Schema.Types.ObjectId,
                required: true,
                refPath: "participants.participantType",
            },
            participantType: {
                type: String,
                required: true,
                enum: ["USER", "CHARITY"],
            },
        },
    ],
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },
    productSnapshot: {
        name: { type: String },
        price: { type: Number },
        imageUrl: { type: String },
    },
    lastMessage: {
        content: { type: String },
        senderId: { type: Schema.Types.ObjectId },
        createdAt: { type: Date },
    },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});
ConversationSchema.index({ "participants.participantId": 1, productId: 1 });
ConversationSchema.index({ updatedAt: -1 });
exports.default = mongoose_1.default.model("Conversation", ConversationSchema);
