import Order from "../models/Order.model";
import Product from "../models/Product.model";
import User from "../models/User.model";
import { sendOrderConfirmationEmail } from "../utils/email";
import { syncStockAfterAngelpageSale } from "./ebayInventory.service.js";
import {
	fireMarketingEvent,
	JOURNEY_EVENTS,
} from "./marketingJourneys.service.js";
import {
	notifyPaymentFailed,
	notifySellersOrderPaid,
} from "../utils/notifyUser.js";
import { ESCROW_HOLD_DAYS } from "../constants/platformPolicy.js";

/**
 * Apply successful Stripe payment to an order (idempotent).
 * Used by verified client callbacks and Stripe webhooks.
 */
export async function applySuccessfulPayment(order, { confirmedAt } = {}) {
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
		order.escrowReleaseAt = new Date(
			Date.now() + ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000,
		);

		try {
			const productIds = order.products
				.map((p) => p.productId)
				.filter(Boolean);
			await syncStockAfterAngelpageSale(productIds);

			for (const item of order.products) {
				if (!item.productId) continue;
				await Product.findByIdAndUpdate(item.productId, {
					$inc: { stockRemaining: -(item.quantity || 1) },
				});
			}
		} catch (syncErr) {
			console.error("Post-payment inventory sync failed:", syncErr);
		}

		try {
			let buyerEmail;
			let firstName = "there";
			if (order.isGuestOrder) {
				buyerEmail = order.guestEmail;
				firstName = order.guestName?.split(" ")[0] || firstName;
			} else if (order.buyerId) {
				const buyer = await User.findById(order.buyerId).select(
					"email firstName",
				);
				buyerEmail = buyer?.email;
				firstName = buyer?.firstName || firstName;
			}
			const charityTotal = order.products.reduce(
				(sum, p) => sum + (p.charityProfit || 0),
				0,
			);
			if (buyerEmail) {
				await sendOrderConfirmationEmail({
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

				fireMarketingEvent(JOURNEY_EVENTS.ORDER_PAID, {
					email: buyerEmail,
					orderId: order._id.toString(),
					grandTotal: order.grandTotal,
					charityTotal,
				});
			}
		} catch (emailErr) {
			console.error("Order confirmation email failed:", emailErr);
		}

		notifySellersOrderPaid(order).catch((err) =>
			console.error("Seller sold notification failed:", err),
		);
	}

	await order.save();
	return order;
}

export async function applyFailedPayment(order) {
	if (!order) return null;
	order.paymentStatus = "Failed";
	order.paymentConfirmed = false;
	await order.save();

	if (order.buyerId) {
		notifyPaymentFailed(order, order.buyerId.toString()).catch(console.error);
	}
	return order;
}
