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
const eventDonation_service_js_1 = require("../../services/eventDonation.service.js");
const EventDonation_model_1 = __importDefault(require("../../models/EventDonation.model"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-08-27",
});
function handleStripeWebhook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
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
                    const donationId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.donationId;
                    if (donationId && ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.type) === "event_donation") {
                        const donation = yield EventDonation_model_1.default.findById(donationId);
                        if (donation) {
                            const expectedAmount = Math.round(donation.amount * 100);
                            if (paymentIntent.amount === expectedAmount) {
                                if (!donation.stripePaymentIntentId) {
                                    donation.stripePaymentIntentId = paymentIntent.id;
                                }
                                yield (0, eventDonation_service_js_1.applySuccessfulEventDonation)(donation, {
                                    confirmedAt: new Date(paymentIntent.created * 1000),
                                });
                            }
                        }
                        break;
                    }
                    const orderId = (_c = paymentIntent.metadata) === null || _c === void 0 ? void 0 : _c.orderId;
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
                    const donationId = (_d = paymentIntent.metadata) === null || _d === void 0 ? void 0 : _d.donationId;
                    if (donationId && ((_e = paymentIntent.metadata) === null || _e === void 0 ? void 0 : _e.type) === "event_donation") {
                        const donation = yield EventDonation_model_1.default.findById(donationId);
                        if (donation) {
                            yield (0, eventDonation_service_js_1.applyFailedEventDonation)(donation);
                        }
                        break;
                    }
                    const orderId = (_f = paymentIntent.metadata) === null || _f === void 0 ? void 0 : _f.orderId;
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
