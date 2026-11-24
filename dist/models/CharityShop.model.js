"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
/* ---------------------------------------------
   🧩 Charity Shop Schema (JS version)
--------------------------------------------- */
const CharityShopSchema = new Schema({
    seller: { type: String, required: true, unique: true },
    userName: {
        type: String,
        required: true,
        unique: true,
        default: function () {
            // Safe fallback for upserts or missing context
            return (this === null || this === void 0 ? void 0 : this.seller) || 'unknown_seller';
        },
    },
    totalProducts: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });
/* ---------------------------------------------
   ⚙️ Model Export
--------------------------------------------- */
const CharityShop = mongoose_1.default.model('CharityShop', CharityShopSchema);
exports.default = CharityShop;
