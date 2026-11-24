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
exports.handleStripeWebhook = handleStripeWebhook;
const stripe_1 = __importDefault(require("stripe"));
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const orderPayment_service_js_1 = require("../../services/orderPayment.service.js");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-08-27",
});
function handleStripeWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const sig = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET is not configured");
            return res.status(503).json({ error: "Stripe webhook not configured" });
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
        catch (err) {
            console.error("Stripe webhook signature verification failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        try {
            switch (event.type) {
                case "payment_intent.succeeded": {
                    const paymentIntent = event.data.object;
                    const orderId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.orderId;
                    if (!orderId)
                        break;
                    const order = yield Order_model_1.default.findById(orderId);
                    if (!order) {
                        console.warn("Stripe webhook: order not found", orderId);
                        break;
                    }
                    if (order.stripePaymentIntentId &&
                        order.stripePaymentIntentId !== paymentIntent.id) {
                        console.warn("Stripe webhook: payment intent mismatch for order", orderId);
                        break;
                    }
                    if (!order.stripePaymentIntentId) {
                        order.stripePaymentIntentId = paymentIntent.id;
                    }
                    const expectedAmount = Math.round(order.grandTotal * 100);
                    if (paymentIntent.amount !== expectedAmount) {
                        console.warn(`Stripe webhook: amount mismatch for order ${orderId}`);
                        break;
                    }
                    yield (0, orderPayment_service_js_1.applySuccessfulPayment)(order, {
                        confirmedAt: new Date(paymentIntent.created * 1000),
                    });
                    break;
                }
                case "payment_intent.payment_failed": {
                    const paymentIntent = event.data.object;
                    const orderId = (_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.orderId;
                    if (!orderId)
                        break;
                    const order = yield Order_model_1.default.findById(orderId);
                    if (order) {
                        yield (0, orderPayment_service_js_1.applyFailedPayment)(order);
                    }
                    break;
                }
                default:
                    break;
            }
            res.json({ received: true });
        }
        catch (error) {
            console.error("Stripe webhook handler error:", error);
            res.status(500).json({ error: "Webhook handler failed" });
        }
    });
}
