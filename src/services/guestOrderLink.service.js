import Order from "../models/Order.model";
import User from "../models/User.model";

const escapeRegex = (value) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Attach past guest orders to a user account (same email) and import shipping address if empty.
 */
export async function linkGuestOrdersToAccount(userId, email, role = "USER") {
	if (!userId || !email || role !== "USER") {
		return { linked: 0, addressImported: false };
	}

	const normalizedEmail = email.trim().toLowerCase();
	const emailPattern = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");

	const orders = await Order.find({
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
		await order.save();
	}

	let addressImported = false;
	const user = await User.findById(userId);
	if (user && (!user.addresses || user.addresses.length === 0)) {
		const addr = orders[0].shippingAddress;
		if (addr?.address && addr?.postcode) {
			user.addresses.push({
				type: "Shipping to",
				name: addr.name || orders[0].guestName || user.firstName || "",
				address: addr.address,
				city: addr.city || "",
				country: addr.country || "United Kingdom",
				postcode: addr.postcode,
			});
			await user.save();
			addressImported = true;
		}
	}

	return { linked: orders.length, addressImported };
}
