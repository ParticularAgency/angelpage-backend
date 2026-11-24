import Order from "../models/Order.model";
import {
	fireMarketingEvent,
	JOURNEY_EVENTS,
} from "./marketingJourneys.service";
import { sendEscrowReleasedEmail } from "../utils/email";

/**
 * Release escrow for a single order (manual admin or auto-release job).
 */
export async function releaseEscrowForOrder(orderId) {
	const order = await Order.findById(orderId).populate(
		"buyerId",
		"email firstName",
	);

	if (!order) {
		throw new Error("Order not found.");
	}
	if (order.escrowStatus === "RELEASED") {
		return { skipped: true, reason: "already_released" };
	}
	if (order.escrowStatus === "DISPUTED") {
		throw new Error("Cannot release disputed escrow.");
	}
	if (order.escrowReleaseAt && new Date(order.escrowReleaseAt) > new Date()) {
		throw new Error("Escrow hold period has not ended.");
	}

	order.escrowStatus = "RELEASED";
	order.SalesProceedAt = new Date();
	await order.save();

	const buyerEmail = order.isGuestOrder
		? order.guestEmail
		: order.buyerId?.email;
	const firstName = order.isGuestOrder
		? order.guestName?.split(" ")[0]
		: order.buyerId?.firstName;

	if (buyerEmail) {
		try {
			await sendEscrowReleasedEmail({
				email: buyerEmail,
				firstName: firstName || "there",
				orderId: order._id.toString(),
				grandTotal: order.grandTotal,
			});
		} catch (emailErr) {
			console.error("Escrow release email failed:", emailErr);
		}

		fireMarketingEvent(JOURNEY_EVENTS.ESCROW_RELEASED, {
			email: buyerEmail,
			orderId: order._id.toString(),
			grandTotal: order.grandTotal,
		});
	}

	return { released: true, orderId: order._id.toString() };
}

export async function processDueEscrowReleases() {
	const now = new Date();
	const orders = await Order.find({
		escrowStatus: "HELD",
		paymentStatus: "Paid",
		escrowReleaseAt: { $lte: now },
		$or: [
			{ disputeStatus: { $exists: false } },
			{ disputeStatus: null },
			{ disputeStatus: "NONE" },
		],
	}).limit(50);

	let released = 0;
	for (const order of orders) {
		try {
			const result = await releaseEscrowForOrder(order._id);
			if (result.released) released += 1;
		} catch (err) {
			console.error("Auto escrow release failed:", order._id, err.message);
		}
	}
	return { released, scanned: orders.length };
}

const HOUR_MS = 60 * 60 * 1000;

export function startEscrowAutoReleaseJob() {
	const run = async () => {
		try {
			const { released, scanned } = await processDueEscrowReleases();
			if (released > 0) {
				console.log(
					`Escrow auto-release: ${released}/${scanned} order(s) released`,
				);
			}
		} catch (err) {
			console.error("Escrow auto-release job error:", err);
		}
	};

	run();
	setInterval(run, HOUR_MS);
}
