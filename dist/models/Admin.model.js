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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Address Schema
const addressSchema = new mongoose_1.Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postcode: { type: String, required: true },
});
// Payment Method Schema
const paymentMethodSchema = new mongoose_1.Schema({
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
// Admin schema definition
const adminSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    description: { type: String },
    profileImage: { type: String, default: "" },
    profileCompleted: { type: Boolean, default: false },
    dateBirth: { type: String },
    verified: { type: Boolean, default: false },
    addresses: [addressSchema],
    payments: [paymentMethodSchema],
    role: { type: String, enum: ["ADMIN"], default: "ADMIN" },
    lastWelcomeBackEmailSent: Date,
    verificationCode: { type: String },
    verificationExpiry: { type: Date },
}, { timestamps: true });
// Hash password before saving
adminSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("password")) {
            this.password = yield bcryptjs_1.default.hash(this.password, 10);
        }
        next();
    });
});
// Password comparison method
adminSchema.methods.comparePassword = function (password) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.compare(password, this.password);
    });
};
exports.default = mongoose_1.default.model("Admin", adminSchema);
