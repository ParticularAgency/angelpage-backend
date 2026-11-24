/**
 * PCI: never accept or persist PAN / CVV / expiry from clients.
 * Stripe owns card data; we only store billing metadata (+ optional Stripe PM id).
 */

const BLOCKED_PAYMENT_KEYS = [
	"accountNumber",
	"cardNumber",
	"cvvNumber",
	"cvv",
	"cvc",
	"expiryDate",
	"expMonth",
	"expYear",
	"expiry",
];

/**
 * @param {Record<string, unknown>|null|undefined} body
 * @returns {{ nameAccountHolder?: string, billingAddress?: object, useShippingAsBilling?: boolean, stripePaymentMethodId?: string }}
 */
export function sanitizePaymentMethodInput(body) {
	if (!body || typeof body !== "object") {
		return {};
	}

	const {
		nameAccountHolder,
		billingAddress,
		useShippingAsBilling,
		stripePaymentMethodId,
	} = body;

	const sanitized = {
		nameAccountHolder:
			typeof nameAccountHolder === "string" ? nameAccountHolder.trim() : "",
		useShippingAsBilling: Boolean(useShippingAsBilling),
		billingAddress:
			billingAddress && typeof billingAddress === "object"
				? {
						name: String(billingAddress.name || ""),
						address: String(billingAddress.address || ""),
						city: String(billingAddress.city || ""),
						country: String(billingAddress.country || ""),
						postCode: String(
							billingAddress.postCode || billingAddress.postcode || "",
						),
					}
				: undefined,
	};

	if (
		typeof stripePaymentMethodId === "string" &&
		stripePaymentMethodId.startsWith("pm_")
	) {
		sanitized.stripePaymentMethodId = stripePaymentMethodId;
	}

	return sanitized;
}

export function rejectsCardSecrets(body) {
	if (!body || typeof body !== "object") return false;
	return BLOCKED_PAYMENT_KEYS.some(
		(key) => body[key] !== undefined && body[key] !== null && body[key] !== "",
	);
}
