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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const OrderedProductSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    charityProfit: { type: Number, required: true },
    adminFee: { type: Number, required: true },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: false },
    charity: { type: mongoose_1.Schema.Types.ObjectId, ref: "Charity", required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalProductCost: { type: Number, required: true },
});
const ShippingAddressSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postcode: { type: String, required: true },
});
const PaymentMethodSchema = new mongoose_1.Schema({
    nameAccountHolder: { type: String, required: true },
    accountNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    cvvNumber: { type: String, required: true },
    billingAddress: {
        name: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
        },
        address: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
        },
        city: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
        },
        country: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
        },
        postCode: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
        },
    },
    useShippingAsBilling: { type: Boolean, default: false },
});
const OrderSchema = new mongoose_1.Schema({
    buyerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    products: { type: [OrderedProductSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
    },
    paymentConfirmed: { type: Boolean, default: false },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    paymentMethod: { type: PaymentMethodSchema, required: true },
    createdAt: { type: Date, default: Date.now },
    carrierCode: { type: String },
    serviceCode: { type: String },
    trackingNumber: { type: String },
    labelId: { type: String },
    labelUrl: { type: String },
    packageInfo: { type: Object },
    pickupInfo: { type: Object },
    orderStatus: {
        type: String,
        enum: ["OrderConfirmed", "ItemShipped", "InTransit", "Delivered", "SalesProceeds"],
        default: "OrderConfirmed",
    },
    status: {
        type: String,
        enum: [
            "OrderConfirmed",
            "LabelCreated",
            "PickedUp",
            "InTransit",
            "OutForDelivery",
            "Delivered",
            "SalesProceeds",
        ],
        default: "OrderConfirmed",
    },
    tags: { type: [String], default: [] },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Order", OrderSchema);
