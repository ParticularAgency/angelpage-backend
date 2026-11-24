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
const eventDonationSchema = new mongoose_1.Schema({
    donationNumber: { type: String, required: true, unique: true },
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: "CommunityEvent", required: true },
    eventTitle: { type: String, required: true },
    eventSlug: { type: String, required: true },
    charityId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Charity" },
    charityName: { type: String, default: "" },
    fundId: { type: String, required: true },
    fundLabel: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "gbp" },
    donorName: { type: String, default: "Anonymous Angel" },
    donorEmail: { type: String, required: true },
    donorUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    isAnonymous: { type: Boolean, default: false },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
    },
    stripePaymentIntentId: { type: String },
    paidAt: { type: Date },
}, { timestamps: true });
eventDonationSchema.index({ eventId: 1, paymentStatus: 1 });
exports.default = mongoose_1.default.model("EventDonation", eventDonationSchema);
