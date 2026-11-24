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
exports.pushNotification = pushNotification;
exports.notifySellersOrderPaid = notifySellersOrderPaid;
exports.notifySellersOrderShipped = notifySellersOrderShipped;
exports.notifyBuyerOrderDelivered = notifyBuyerOrderDelivered;
exports.notifyNewMessage = notifyNewMessage;
exports.notifyPaymentFailed = notifyPaymentFailed;
const Notification_model_1 = __importDefault(require("../models/Notification.model"));
const socket_1 = require("../config/socket");
/**
 * Create in-app + socket notification for a user or charity.
 */
function pushNotification(_a) {
    return __awaiter(this, arguments, void 0, function* ({ recipientId, recipientType, notificationType, message, metadata = {}, }) {
        if (!recipientId || !recipientType || !notificationType || !message) {
            return null;
        }
        const notification = new Notification_model_1.default({
            recipientId,
            recipientType,
            notificationType,
            message,
            metadata,
            isRead: false,
        });
        yield notification.save();
        try {
            (0, socket_1.getIO)()
                .to(`user:${recipientId}`)
                .emit("new-notification", notification);
        }
        catch (_b) {
            // Socket unavailable in scripts/tests
        }
        return notification;
    });
}
function notifySellersOrderPaid(order) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const notified = new Set();
        for (const item of order.products || []) {
            const sellerId = ((_b = (_a = item.seller) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || item.seller;
            const charityId = ((_d = (_c = item.charity) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) || item.charity;
            const recipientId = sellerId || charityId;
            if (!recipientId || notified.has(String(recipientId)))
                continue;
            notified.add(String(recipientId));
            yield pushNotification({
                recipientId,
                recipientType: charityId && !sellerId ? "CHARITY" : "USER",
                notificationType: "PRODUCT_SOLD_SUCCESS",
                message: `"${item.name}" sold — £${(item.totalProductCost || item.price * item.quantity || 0).toFixed(2)}. Funds held in escrow.`,
                metadata: {
                    orderId: order._id.toString(),
                    productId: ((_f = (_e = item.productId) === null || _e === void 0 ? void 0 : _e.toString) === null || _f === void 0 ? void 0 : _f.call(_e)) || item.productId,
                },
            });
        }
    });
}
function notifySellersOrderShipped(order, trackingNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const notified = new Set();
        for (const item of order.products || []) {
            const sellerId = ((_b = (_a = item.seller) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = item.seller) === null || _c === void 0 ? void 0 : _c.toString());
            if (!sellerId || notified.has(sellerId))
                continue;
            notified.add(sellerId);
            yield pushNotification({
                recipientId: sellerId,
                recipientType: "USER",
                notificationType: "PRODUCT_SHIPPED",
                message: `Order #${order._id.toString().slice(-6)} shipped${trackingNumber ? ` — tracking ${trackingNumber}` : ""}.`,
                metadata: { orderId: order._id.toString(), trackingNumber },
            });
        }
        const buyerId = ((_e = (_d = order.buyerId) === null || _d === void 0 ? void 0 : _d.toString) === null || _e === void 0 ? void 0 : _e.call(_d)) || order.buyerId;
        if (buyerId) {
            yield pushNotification({
                recipientId: buyerId,
                recipientType: "USER",
                notificationType: "PRODUCT_SHIPPED",
                message: `Your order has shipped${trackingNumber ? ` — tracking ${trackingNumber}` : ""}.`,
                metadata: { orderId: order._id.toString(), trackingNumber },
            });
        }
        else if (order.isGuestOrder && order.guestEmail) {
            // Guest buyers have no in-app account — email handles this
        }
    });
}
function notifyBuyerOrderDelivered(order) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const buyerId = ((_b = (_a = order.buyerId) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || order.buyerId;
        if (!buyerId)
            return;
        yield pushNotification({
            recipientId: buyerId,
            recipientType: "USER",
            notificationType: "PRODUCT_DELIVERED",
            message: `Your order #${order._id.toString().slice(-6)} was delivered.`,
            metadata: { orderId: order._id.toString() },
        });
    });
}
function notifyNewMessage(_a) {
    return __awaiter(this, arguments, void 0, function* ({ recipientId, recipientType, senderName, conversationId, }) {
        yield pushNotification({
            recipientId,
            recipientType,
            notificationType: "NEW_MESSAGE",
            message: `New message from ${senderName || "a user"}.`,
            metadata: { conversationId },
        });
    });
}
function notifyPaymentFailed(order, buyerId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!buyerId)
            return;
        yield pushNotification({
            recipientId: buyerId,
            recipientType: "USER",
            notificationType: "PRODUCT_PURCHASED",
            message: `Payment failed for order #${order._id.toString().slice(-6)}. Please try again.`,
            metadata: { orderId: order._id.toString(), failed: true },
        });
    });
}
