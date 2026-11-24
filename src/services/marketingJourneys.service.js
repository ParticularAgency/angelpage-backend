/**
 * Marketing journey triggers — transactional (SendGrid) + automation (Brevo / Customer.io).
 *
 * Env:
 *   BREVO_API_KEY          — Brevo (Sendinblue) automation events
 *   CUSTOMERIO_SITE_ID     — Customer.io site id
 *   CUSTOMERIO_API_KEY     — Customer.io track API key
 *   MARKETING_WEBHOOK_URL  — Generic webhook for any ESP
 */

const PROVIDER = process.env.MARKETING_PROVIDER || "brevo";

async function postBrevoEvent(eventName, email, properties = {}) {
	const apiKey = process.env.BREVO_API_KEY;
	if (!apiKey) {
		return { skipped: true, reason: "BREVO_API_KEY not configured" };
	}

	const res = await fetch("https://api.brevo.com/v3/events", {
		method: "POST",
		headers: {
			"api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			event_name: eventName,
			event_date: new Date().toISOString(),
			identifiers: { email_id: email },
			event_properties: properties,
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Brevo event failed: ${err}`);
	}
	return { success: true, provider: "brevo" };
}

async function postCustomerIoEvent(eventName, email, properties = {}) {
	const siteId = process.env.CUSTOMERIO_SITE_ID;
	const apiKey = process.env.CUSTOMERIO_API_KEY;
	if (!siteId || !apiKey) {
		return { skipped: true, reason: "Customer.io credentials not configured" };
	}

	const auth = Buffer.from(`${siteId}:${apiKey}`).toString("base64");
	const res = await fetch(
		`https://track.customer.io/api/v1/customers/${encodeURIComponent(email)}/events`,
		{
			method: "POST",
			headers: {
				Authorization: `Basic ${auth}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name: eventName, data: properties }),
		},
	);

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Customer.io event failed: ${err}`);
	}
	return { success: true, provider: "customerio" };
}

async function postGenericWebhook(eventName, email, properties = {}) {
	const url = process.env.MARKETING_WEBHOOK_URL;
	if (!url) {
		return { skipped: true, reason: "MARKETING_WEBHOOK_URL not configured" };
	}

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			event: eventName,
			email,
			properties,
			timestamp: new Date().toISOString(),
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Marketing webhook failed: ${err}`);
	}
	return { success: true, provider: "webhook" };
}

/**
 * Fire-and-forget journey event. Never throws to callers.
 */
export async function triggerMarketingEvent(eventName, { email, ...properties }) {
	if (!email) {
		return { skipped: true, reason: "No email" };
	}

	try {
		let result;
		if (PROVIDER === "customerio") {
			result = await postCustomerIoEvent(eventName, email, properties);
		} else if (PROVIDER === "webhook") {
			result = await postGenericWebhook(eventName, email, properties);
		} else {
			result = await postBrevoEvent(eventName, email, properties);
		}

		if (result.skipped && process.env.MARKETING_WEBHOOK_URL) {
			result = await postGenericWebhook(eventName, email, properties);
		}

		return result;
	} catch (err) {
		console.error(`Marketing event [${eventName}] failed:`, err.message);
		return { success: false, error: err.message };
	}
}

/** Canonical Angelpage journey events */
export const JOURNEY_EVENTS = {
	USER_REGISTERED: "user.registered",
	ORDER_PAID: "order.paid",
	ORDER_SHIPPED: "order.shipped",
	ORDER_DELIVERED: "order.delivered",
	ESCROW_RELEASED: "escrow.released",
	PRODUCT_APPROVED: "product.approved",
	ABANDONED_CART: "cart.abandoned",
	SELLER_INACTIVE: "seller.inactive",
};

export function fireMarketingEvent(eventName, payload) {
	triggerMarketingEvent(eventName, payload).catch(() => {});
}
