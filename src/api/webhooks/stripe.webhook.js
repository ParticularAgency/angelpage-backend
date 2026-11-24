import Stripe from "stripe";
import Order from "../../models/Order.model";
import {
	applyFailedPayment,
	applySuccessfulPayment,
} from "../../services/orderPayment.service.js";
import {
	applyFailedEventDonation,
	applySuccessfulEventDonation,
} from "../../services/eventDonation.service.js";
import EventDonation from "../../models/EventDonation.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2020-08-27",
});

export async function handleStripeWebhook(req, res) {
	const sig = req.headers["stripe-signature"];
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.error("STRIPE_WEBHOOK_SECRET is not configured");
		return res.status(503).json({ error: "Stripe webhook not configured" });
	}

	let event;
	try {
		event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
	} catch (err) {
		console.error("Stripe webhook signature verification failed:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	try {
		switch (event.type) {
			case "payment_intent.succeeded": {
				const paymentIntent = event.data.object;
				const donationId = paymentIntent.metadata?.donationId;

				if (donationId && paymentIntent.metadata?.type === "event_donation") {
					const donation = await EventDonation.findById(donationId);
					if (donation) {
						const expectedAmount = Math.round(donation.amount * 100);
						if (paymentIntent.amount === expectedAmount) {
							if (!donation.stripePaymentIntentId) {
								donation.stripePaymentIntentId = paymentIntent.id;
							}
							await applySuccessfulEventDonation(donation, {
								confirmedAt: new Date(paymentIntent.created * 1000),
							});
						}
					}
					break;
				}

				const orderId = paymentIntent.metadata?.orderId;
				if (!orderId) break;

				const order = await Order.findById(orderId);
				if (!order) {
					console.warn("Stripe webhook: order not found", orderId);
					break;
				}

				if (
					order.stripePaymentIntentId &&
					order.stripePaymentIntentId !== paymentIntent.id
				) {
					console.warn(
						"Stripe webhook: payment intent mismatch for order",
						orderId,
					);
					break;
				}

				if (!order.stripePaymentIntentId) {
					order.stripePaymentIntentId = paymentIntent.id;
				}

				const expectedAmount = Math.round(order.grandTotal * 100);
				if (paymentIntent.amount !== expectedAmount) {
					console.warn(
						`Stripe webhook: amount mismatch for order ${orderId}`,
					);
					break;
				}

				await applySuccessfulPayment(order, {
					confirmedAt: new Date(paymentIntent.created * 1000),
				});
				break;
			}
			case "payment_intent.payment_failed": {
				const paymentIntent = event.data.object;
				const donationId = paymentIntent.metadata?.donationId;

				if (donationId && paymentIntent.metadata?.type === "event_donation") {
					const donation = await EventDonation.findById(donationId);
					if (donation) {
						await applyFailedEventDonation(donation);
					}
					break;
				}

				const orderId = paymentIntent.metadata?.orderId;
				if (!orderId) break;

				const order = await Order.findById(orderId);
				if (order) {
					await applyFailedPayment(order);
				}
				break;
			}
			default:
				break;
		}

		res.json({ received: true });
	} catch (error) {
		console.error("Stripe webhook handler error:", error);
		res.status(500).json({ error: "Webhook handler failed" });
	}
}
