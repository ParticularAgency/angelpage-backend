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
exports.applySuccessfulPayment = applySuccessfulPayment;
exports.applyFailedPayment = applyFailedPayment;
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const email_1 = require("../utils/email");
const ebayInventory_service_js_1 = require("./ebayInventory.service.js");
const marketingJourneys_service_js_1 = require("./marketingJourneys.service.js");
const notifyUser_js_1 = require("../utils/notifyUser.js");
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
/**
 * Apply successful Stripe payment to an order (idempotent).
 * Used by verified client callbacks and Stripe webhooks.
 */
function applySuccessfulPayment(order_1) {
    return __awaiter(this, arguments, void 0, function* (order, { confirmedAt } = {}) {
        var _a;
        if (!order) {
            throw new Error("Order is required");
        }
        if (order.paymentConfirmed && order.paymentStatus === "Paid") {
            return order;
        }
        order.paymentStatus = "Paid";
        order.paymentConfirmed = true;
        order.paymentConfirmedAt =
            confirmedAt || order.paymentConfirmedAt || new Date();
        order.status = order.status === "OrderPlaced" ? "OrderConfirmed" : order.status;
        order.orderStatus =
            order.orderStatus === "OrderPlaced" ? "OrderConfirmed" : order.orderStatus;
        if (!order.escrowReleaseAt) {
            order.escrowStatus = "HELD";
            order.escrowReleaseAt = new Date(Date.now() + platformPolicy_js_1.ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000);
            try {
                const productIds = order.products
                    .map((p) => p.productId)
                    .filter(Boolean);
                yield (0, ebayInventory_service_js_1.syncStockAfterAngelpageSale)(productIds);
                for (const item of order.products) {
                    if (!item.productId)
                        continue;
                    yield Product_model_1.default.findByIdAndUpdate(item.productId, {
                        $inc: { stockRemaining: -(item.quantity || 1) },
                    });
                }
            }
            catch (syncErr) {
                console.error("Post-payment inventory sync failed:", syncErr);
            }
            try {
                let buyerEmail;
                let firstName = "there";
                if (order.isGuestOrder) {
                    buyerEmail = order.guestEmail;
                    firstName = ((_a = order.guestName) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) || firstName;
                }
                else if (order.buyerId) {
                    const buyer = yield User_model_1.default.findById(order.buyerId).select("email firstName");
                    buyerEmail = buyer === null || buyer === void 0 ? void 0 : buyer.email;
                    firstName = (buyer === null || buyer === void 0 ? void 0 : buyer.firstName) || firstName;
                }
                const charityTotal = order.products.reduce((sum, p) => sum + (p.charityProfit || 0), 0);
                if (buyerEmail) {
                    yield (0, email_1.sendOrderConfirmationEmail)({
                        email: buyerEmail,
                        firstName,
                        orderId: order._id.toString(),
                        grandTotal: order.grandTotal,
                        charityTotal,
                        products: order.products.map((p) => ({
                            name: p.name,
                            charityProfit: p.charityProfit || 0,
                        })),
                    });
                    (0, marketingJourneys_service_js_1.fireMarketingEvent)(marketingJourneys_service_js_1.JOURNEY_EVENTS.ORDER_PAID, {
                        email: buyerEmail,
                        orderId: order._id.toString(),
                        grandTotal: order.grandTotal,
                        charityTotal,
                    });
                }
            }
            catch (emailErr) {
                console.error("Order confirmation email failed:", emailErr);
            }
            (0, notifyUser_js_1.notifySellersOrderPaid)(order).catch((err) => console.error("Seller sold notification failed:", err));
        }
        yield order.save();
        return order;
    });
}
function applyFailedPayment(order) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!order)
            return null;
        order.paymentStatus = "Failed";
        order.paymentConfirmed = false;
        yield order.save();
        if (order.buyerId) {
            (0, notifyUser_js_1.notifyPaymentFailed)(order, order.buyerId.toString()).catch(console.error);
        }
        return order;
    });
}
