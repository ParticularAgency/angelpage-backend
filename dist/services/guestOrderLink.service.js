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
exports.linkGuestOrdersToAccount = linkGuestOrdersToAccount;
const Order_model_1 = __importDefault(require("../models/Order.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * Attach past guest orders to a user account (same email) and import shipping address if empty.
 */
function linkGuestOrdersToAccount(userId_1, email_1) {
    return __awaiter(this, arguments, void 0, function* (userId, email, role = "USER") {
        if (!userId || !email || role !== "USER") {
            return { linked: 0, addressImported: false };
        }
        const normalizedEmail = email.trim().toLowerCase();
        const emailPattern = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");
        const orders = yield Order_model_1.default.find({
            isGuestOrder: true,
            guestEmail: emailPattern,
            $or: [{ buyerId: { $exists: false } }, { buyerId: null }],
            paymentStatus: { $in: ["Paid", "Pending", "Failed"] },
        }).sort({ createdAt: -1 });
        if (!orders.length) {
            return { linked: 0, addressImported: false };
        }
        for (const order of orders) {
            order.buyerId = userId;
            yield order.save();
        }
        let addressImported = false;
        const user = yield User_model_1.default.findById(userId);
        if (user && (!user.addresses || user.addresses.length === 0)) {
            const addr = orders[0].shippingAddress;
            if ((addr === null || addr === void 0 ? void 0 : addr.address) && (addr === null || addr === void 0 ? void 0 : addr.postcode)) {
                user.addresses.push({
                    type: "Shipping to",
                    name: addr.name || orders[0].guestName || user.firstName || "",
                    address: addr.address,
                    city: addr.city || "",
                    country: addr.country || "United Kingdom",
                    postcode: addr.postcode,
                });
                yield user.save();
                addressImported = true;
            }
        }
        return { linked: orders.length, addressImported };
    });
}
