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
                refPath: "participants.participantType", // Dynamic reference based on participantType
            },
            participantType: {
                type: String,
                required: true,
                enum: ["USER", "CHARITY"], // Only these types are allowed
            },
        },
    ],
    createdAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model("Conversation", ConversationSchema);
