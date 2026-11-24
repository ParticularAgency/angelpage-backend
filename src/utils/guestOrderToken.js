import crypto from "crypto";

export function generateGuestOrderToken() {
	return crypto.randomBytes(32).toString("hex");
}

export function hashGuestOrderToken(token) {
	return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function verifyGuestOrderToken(token, storedHash) {
	if (!token || !storedHash) return false;
	try {
		const candidate = hashGuestOrderToken(token);
		const a = Buffer.from(candidate, "hex");
		const b = Buffer.from(storedHash, "hex");
		if (a.length !== b.length) return false;
		return crypto.timingSafeEqual(a, b);
	} catch {
		return false;
	}
}

export function extractGuestToken(req) {
	return (
		req.body?.guestToken ||
		req.query?.guestToken ||
		req.header("X-Guest-Order-Token") ||
		null
	);
}

/** Guest checkout may only update payment-related fields */
export const GUEST_ALLOWED_UPDATE = {
	statuses: new Set(["OrderPlaced", "OrderConfirmed"]),
	paymentStatuses: new Set(["Pending", "Paid", "Failed"]),
};

export function assertGuestMayUpdateFields(body) {
	const { status, orderStatus, paymentStatus } = body;
	if (status && !GUEST_ALLOWED_UPDATE.statuses.has(status)) {
		return `Guest cannot set status to ${status}`;
	}
	if (orderStatus && !GUEST_ALLOWED_UPDATE.statuses.has(orderStatus)) {
		return `Guest cannot set orderStatus to ${orderStatus}`;
	}
	if (paymentStatus && !GUEST_ALLOWED_UPDATE.paymentStatuses.has(paymentStatus)) {
		return `Guest cannot set paymentStatus to ${paymentStatus}`;
	}
	return null;
}
