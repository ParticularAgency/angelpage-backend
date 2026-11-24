"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const { Schema } = mongoose_1.default;
/* ------------------------ 🏠 Address Schema ------------------------ */
const addressSchema = new Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postcode: { type: String, required: true },
});
/* ------------------------ Payment Schema (billing only — no PAN/CVV) ------------------------ */
const paymentMethodSchema = new Schema({
    nameAccountHolder: { type: String, required: true },
    stripePaymentMethodId: { type: String, default: "" },
    billingAddress: {
        name: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        address: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        city: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        country: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
        postCode: {
            type: String,
            required: function () {
                return !this.useShippingAsBilling;
            },
            default: "",
        },
    },
    useShippingAsBilling: { type: Boolean, default: false },
});
/* ------------------------ 💚 Charity Schema ------------------------ */
const charitySchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["CHARITY"], default: "CHARITY" },
    profileImage: { type: String, default: "" },
    charityBannerImage: { type: String, default: "" },
    profileCompleted: { type: Boolean, default: false },
    dateBirth: { type: String },
    verified: { type: Boolean, default: false },
    addresses: [addressSchema],
    payments: [paymentMethodSchema],
    charityName: { type: String },
    charityNumber: { type: String },
    charityID: { type: String },
    phoneNumber: { type: String },
    websiteLink: { type: String },
    description: { type: String },
    storefrontId: { type: String, unique: true },
    stripeAccountId: { type: String },
    registrationStatus: { type: String, default: "PENDING" },
    totalEarned: { type: Number, default: 0 },
    totalHeldFunds: { type: Number, default: 0 },
    upcomingFunds: { type: Number, default: 0 },
    thresholdReached: { type: Boolean, default: false },
    holdDate: { type: Date },
    adminConfirmed: { type: Boolean, default: false },
    listedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    favoriteProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    favoriteCharities: [{ type: Schema.Types.ObjectId, ref: "Charity" }],
    lastWelcomeBackEmailSent: { type: Date },
    verificationCode: { type: String },
    verificationExpiry: { type: Date },
}, { timestamps: true });
/* ------------------------ 🔒 Password Hashing ------------------------ */
charitySchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isNew) {
            this.storefrontId = (0, uuid_1.v4)();
        }
        if (this.isModified("password")) {
            this.password = yield bcryptjs_1.default.hash(this.password, 10);
        }
        next();
    });
});
/* ------------------------ 🔑 Compare Password ------------------------ */
charitySchema.methods.comparePassword = function (password) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.compare(password, this.password);
    });
};
/* ------------------------ 📦 Export Model ------------------------ */
const Charity = mongoose_1.default.model("Charity", charitySchema);
exports.default = Charity;
