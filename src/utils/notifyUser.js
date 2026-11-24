import Notification from "../models/Notification.model";
import { getIO } from "../config/socket";

/**
 * Create in-app + socket notification for a user or charity.
 */
export async function pushNotification({
	recipientId,
	recipientType,
	notificationType,
	message,
	metadata = {},
}) {
	if (!recipientId || !recipientType || !notificationType || !message) {
		return null;
	}

	const notification = new Notification({
		recipientId,
		recipientType,
		notificationType,
		message,
		metadata,
		isRead: false,
	});

	await notification.save();

	try {
		getIO()
			.to(`user:${recipientId}`)
			.emit("new-notification", notification);
	} catch {
		// Socket unavailable in scripts/tests
	}

	return notification;
}

export async function notifySellersOrderPaid(order) {
	const notified = new Set();
	for (const item of order.products || []) {
		const sellerId = item.seller?.toString?.() || item.seller;
		const charityId = item.charity?.toString?.() || item.charity;
		const recipientId = sellerId || charityId;
		if (!recipientId || notified.has(String(recipientId))) continue;
		notified.add(String(recipientId));

		await pushNotification({
			recipientId,
			recipientType: charityId && !sellerId ? "CHARITY" : "USER",
			notificationType: "PRODUCT_SOLD_SUCCESS",
			message: `"${item.name}" sold — £${(item.totalProductCost || item.price * item.quantity || 0).toFixed(2)}. Funds held in escrow.`,
			metadata: {
				orderId: order._id.toString(),
				productId: item.productId?.toString?.() || item.productId,
			},
		});
	}
}

export async function notifySellersOrderShipped(order, trackingNumber) {
	const notified = new Set();
	for (const item of order.products || []) {
		const sellerId = item.seller?.toString?.() || item.seller?.toString();
		if (!sellerId || notified.has(sellerId)) continue;
		notified.add(sellerId);

		await pushNotification({
			recipientId: sellerId,
			recipientType: "USER",
			notificationType: "PRODUCT_SHIPPED",
			message: `Order #${order._id.toString().slice(-6)} shipped${trackingNumber ? ` — tracking ${trackingNumber}` : ""}.`,
			metadata: { orderId: order._id.toString(), trackingNumber },
		});
	}

	const buyerId = order.buyerId?.toString?.() || order.buyerId;
	if (buyerId) {
		await pushNotification({
			recipientId: buyerId,
			recipientType: "USER",
			notificationType: "PRODUCT_SHIPPED",
			message: `Your order has shipped${trackingNumber ? ` — tracking ${trackingNumber}` : ""}.`,
			metadata: { orderId: order._id.toString(), trackingNumber },
		});
	} else if (order.isGuestOrder && order.guestEmail) {
		// Guest buyers have no in-app account — email handles this
	}
}

export async function notifyBuyerOrderDelivered(order) {
	const buyerId = order.buyerId?.toString?.() || order.buyerId;
	if (!buyerId) return;

	await pushNotification({
		recipientId: buyerId,
		recipientType: "USER",
		notificationType: "PRODUCT_DELIVERED",
		message: `Your order #${order._id.toString().slice(-6)} was delivered.`,
		metadata: { orderId: order._id.toString() },
	});
}

export async function notifyNewMessage({
	recipientId,
	recipientType,
	senderName,
	conversationId,
}) {
	await pushNotification({
		recipientId,
		recipientType,
		notificationType: "NEW_MESSAGE",
		message: `New message from ${senderName || "a user"}.`,
		metadata: { conversationId },
	});
}

export async function notifyPaymentFailed(order, buyerId) {
	if (!buyerId) return;
	await pushNotification({
		recipientId: buyerId,
		recipientType: "USER",
		notificationType: "PRODUCT_PURCHASED",
		message: `Payment failed for order #${order._id.toString().slice(-6)}. Please try again.`,
		metadata: { orderId: order._id.toString(), failed: true },
	});
}
