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
const TrackingEventSchema = new mongoose_1.Schema({
    occurred_at: { type: Date, required: true },
    carrier_occurred_at: { type: Date, required: false },
    description: { type: String, required: true },
    city_locality: { type: String },
    state_province: { type: String },
    postal_code: { type: String },
    country_code: { type: String },
    company_name: { type: String },
    signer: { type: String },
    event_code: { type: String },
    carrier_detail_code: { type: String },
    status_code: { type: String },
    status_detail_code: { type: String },
    status_description: { type: String },
    status_detail_description: { type: String },
    carrier_status_code: { type: String },
    carrier_status_description: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
});
const DimensionsSchema = new mongoose_1.Schema({
    height: { type: String, required: true },
    width: { type: String, required: true },
    length: { type: String, required: true },
});
const OrderedProductSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    charityProfit: { type: Number, required: true },
    adminFee: { type: Number, required: true },
    weight: { type: String, required: false }, // Updated to string
    dimensions: { type: DimensionsSchema, required: false }, // Nested schema for dimensions
    additionalInfo: { type: String },
    category: { type: String },
    subcategory: { type: String },
    condition: { type: String },
    brand: { type: String },
    material: { type: String },
    color: { type: String },
    size: { type: String },
    images: { type: [String], default: [] }, // Array of image URLs
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: false },
    charity: { type: mongoose_1.Schema.Types.ObjectId, ref: "Charity", required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalProductCost: { type: Number, required: true },
});
const ShippingAddressSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, required: true },
    postcode: { type: String, required: true },
    email: { type: String },
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
    grandTotal: { type: Number, required: true, min: 0 },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
    },
    paymentConfirmed: { type: Boolean, default: false },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    paymentMethod: { type: PaymentMethodSchema, required: true },
    paymentConfirmedAt: { type: Date, default: null },
    ItemShippedAt: { type: Date, default: null },
    CreateLabelAt: { type: Date, default: null },
    trackingStatus: { type: String },
    ItemDeliveredAt: { type: Date, default: null },
    SalesProceedAt: { type: Date, default: null },
    carrierCode: { type: String },
    serviceCode: { type: String },
    packageCode: { type: String },
    orderNumber: { type: String },
    status_code: { type: String },
    tracking_url: { type: String },
    status_detail_code: { type: String },
    status_description: { type: String },
    carrier_status_code: { type: String },
    trackingEvents: { type: [TrackingEventSchema], default: [] },
    carrier_status_description: { type: String },
    estimated_delivery_date: { type: String },
    actual_delivery_date: { type: String },
    totalWeight: { type: Number, required: false }, // Updated to ensure weight is stored as a number
    combinedDimensions: {
        length: { type: Number, required: false },
        width: { type: Number, required: false },
        height: { type: Number, required: false },
    },
    trackingNumber: { type: String },
    labelId: { type: String },
    labelUrl: { type: String },
    label_download: { type: String },
    labelData: { type: String },
    shipStationOrderId: { type: Number },
    shipmentId: { type: String },
    shipmentCost: { type: Number },
    insuranceCost: { type: Number },
    packageInfo: { type: Object },
    pickupInfo: { type: Object },
    orderStatus: {
        type: String,
        enum: [
            "OrderPlaced",
            "OrderConfirmed",
            "LabelCreated",
            "awaiting_shipment",
            "ItemShipped",
            "PickedUp",
            "InTransit",
            "OutForDelivery",
            "Delivered",
            "SalesProceeds",
            "LabelFailed",
            "ShipStationOrderFailed",
            "OrderCancel",
        ],
        default: "OrderPlaced",
    },
    status: {
        type: String,
        enum: [
            "OrderPlaced",
            "OrderConfirmed",
            "LabelCreated",
            "awaiting_shipment",
            "ItemShipped",
            "PickedUp",
            "InTransit",
            "OutForDelivery",
            "Delivered",
            "SalesProceeds",
            "LabelFailed",
            "ShipStationOrderFailed",
            "OrderCancel",
        ],
        default: "OrderPlaced",
    },
    tags: { type: [String], default: [] },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Order", OrderSchema);
