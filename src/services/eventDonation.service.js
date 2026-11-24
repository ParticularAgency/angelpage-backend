import EventDonation from "../models/EventDonation.model";
import CommunityEvent from "../models/CommunityEvent.model";
import Charity from "../models/Charity.model";
import { stripe } from "../config/stripe.js";
import { sendEmail } from "../utils/email";

export const DEFAULT_EVENT_FUNDS = [
	{
		id: "direct-purchase",
		label: "Direct Purchase",
		description: "Direct sourcing of wholesome local supplies and nutrition.",
		percent: 85,
	},
	{
		id: "safety-packs",
		label: "Safety Packs",
		description: "Maternal care, medical sanitization, and essential kits.",
		percent: 10,
	},
	{
		id: "field-logistics",
		label: "Field Logistics",
		description: "Clean local transit and verified ground distribution.",
		percent: 5,
	},
];

export const resolveEventFunds = (event) => {
	if (Array.isArray(event.fundAllocations) && event.fundAllocations.length > 0) {
		return event.fundAllocations;
	}
	return DEFAULT_EVENT_FUNDS;
};

const generateDonationNumber = () => {
	const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const rand = Math.floor(1000 + Math.random() * 9000);
	return `EVT-DON-${stamp}-${rand}`;
};

const resolveCharityForEvent = async (event) => {
	if (event.charityId) {
		const charity = await Charity.findById(event.charityId).select(
			"charityName name email",
		);
		if (charity) {
			return {
				charityId: charity._id,
				charityName: charity.charityName || charity.name || "Charity Partner",
			};
		}
	}

	if (event.authorRole === "CHARITY" && event.authorId) {
		const charity = await Charity.findById(event.authorId).select(
			"charityName name email",
		);
		if (charity) {
			return {
				charityId: charity._id,
				charityName: charity.charityName || charity.name || "Charity Partner",
			};
		}
	}

	return { charityId: null, charityName: "Angelpage Community Fund" };
};

export const buildDonationReceipt = (donation, event) => ({
	donationNumber: donation.donationNumber,
	amount: donation.amount,
	currency: donation.currency,
	fundId: donation.fundId,
	fundLabel: donation.fundLabel,
	donorName: donation.isAnonymous ? "Anonymous Angel" : donation.donorName,
	donorEmail: donation.donorEmail,
	eventTitle: donation.eventTitle,
	eventSlug: donation.eventSlug,
	charityName: donation.charityName,
	paidAt: donation.paidAt,
	paymentStatus: donation.paymentStatus,
	fundAllocations: resolveEventFunds(event || {}),
});

export async function createEventDonationCheckout({
	eventId,
	amount,
	fundId,
	donorName,
	donorEmail,
	isAnonymous = false,
	donorUserId,
}) {
	const event = await CommunityEvent.findOne({
		_id: eventId,
		status: "published",
	});

	if (!event) {
		throw new Error("Donation event not found.");
	}

	const parsedAmount = Number(amount);
	if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
		throw new Error("Minimum donation is $1.");
	}

	if (!donorEmail?.trim()) {
		throw new Error("Email is required for your donation receipt.");
	}

	const funds = resolveEventFunds(event);
	const selectedFund = funds.find(f => f.id === fundId) || funds[0];
	if (!selectedFund) {
		throw new Error("Please select a valid fund.");
	}

	const { charityId, charityName } = await resolveCharityForEvent(event);
	const displayName =
		isAnonymous || !donorName?.trim()
			? "Anonymous Angel"
			: donorName.trim();

	const donation = await EventDonation.create({
		donationNumber: generateDonationNumber(),
		eventId: event._id,
		eventTitle: event.title,
		eventSlug: event.slug,
		charityId: charityId || undefined,
		charityName,
		fundId: selectedFund.id,
		fundLabel: selectedFund.label,
		amount: parsedAmount,
		currency: "usd",
		donorName: displayName,
		donorEmail: donorEmail.trim().toLowerCase(),
		donorUserId: donorUserId || undefined,
		isAnonymous: Boolean(isAnonymous),
		paymentStatus: "pending",
	});

	const paymentIntent = await stripe.paymentIntents.create({
		amount: Math.round(parsedAmount * 100),
		currency: "usd",
		automatic_payment_methods: { enabled: true },
		metadata: {
			donationId: donation._id.toString(),
			eventId: event._id.toString(),
			eventSlug: event.slug,
			fundId: selectedFund.id,
			fundLabel: selectedFund.label,
			type: "event_donation",
		},
		receipt_email: donorEmail.trim().toLowerCase(),
		description: `${event.title} — ${selectedFund.label}`,
	});

	donation.stripePaymentIntentId = paymentIntent.id;
	await donation.save();

	return {
		donation,
		event,
		clientSecret: paymentIntent.client_secret,
	};
}

export async function applySuccessfulEventDonation(donation, { confirmedAt } = {}) {
	if (!donation) {
		throw new Error("Donation is required.");
	}

	if (donation.paymentStatus === "paid") {
		return donation;
	}

	donation.paymentStatus = "paid";
	donation.paidAt = confirmedAt || new Date();
	await donation.save();

	await CommunityEvent.findByIdAndUpdate(donation.eventId, {
		$inc: { donationRaised: donation.amount },
	});

	if (donation.charityId) {
		await Charity.findByIdAndUpdate(donation.charityId, {
			$inc: { upcomingFunds: donation.amount },
		});
	}

	try {
		const event = await CommunityEvent.findById(donation.eventId);
		const receipt = buildDonationReceipt(donation, event);
		await sendEmail({
			to: donation.donorEmail,
			subject: `Your Angelpage donation receipt — ${donation.donationNumber}`,
			text: `Thank you ${receipt.donorName}.\n\nDonation: £${donation.amount.toFixed(2)}\nFund: ${donation.fundLabel}\nEvent: ${donation.eventTitle}\nReceipt: ${donation.donationNumber}\nCharity: ${donation.charityName}\n\nWith gratitude,\nAngelpage`,
			html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #E8D4F4;border-radius:16px;">
          <p style="color:#611192;font-size:12px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;">Donation Receipt</p>
          <h1 style="color:#1a1a1a;font-size:24px;margin:8px 0;">Thank you, ${receipt.donorName}</h1>
          <p style="font-size:32px;font-weight:bold;color:#611192;margin:16px 0;">£${donation.amount.toFixed(2)}</p>
          <table style="width:100%;font-size:14px;color:#444;">
            <tr><td style="padding:6px 0;">Receipt</td><td style="text-align:right;font-weight:bold;">${donation.donationNumber}</td></tr>
            <tr><td style="padding:6px 0;">Fund</td><td style="text-align:right;">${donation.fundLabel}</td></tr>
            <tr><td style="padding:6px 0;">Event</td><td style="text-align:right;">${donation.eventTitle}</td></tr>
            <tr><td style="padding:6px 0;">Beneficiary</td><td style="text-align:right;">${donation.charityName}</td></tr>
            <tr><td style="padding:6px 0;">Date</td><td style="text-align:right;">${donation.paidAt?.toLocaleDateString("en-GB") || ""}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#666;">Your gift is allocated to the selected fund and recorded on the event ledger.</p>
        </div>
      `,
		});
	} catch (emailErr) {
		console.error("Donation receipt email failed:", emailErr);
	}

	return donation;
}

export async function applyFailedEventDonation(donation) {
	if (!donation) return null;
	donation.paymentStatus = "failed";
	await donation.save();
	return donation;
}

export async function confirmEventDonationPayment(donationId, paymentIntentId) {
	const donation = await EventDonation.findById(donationId);
	if (!donation) {
		throw new Error("Donation not found.");
	}

	if (donation.paymentStatus === "paid") {
		const event = await CommunityEvent.findById(donation.eventId);
		return {
			donation,
			receipt: buildDonationReceipt(donation, event),
			event,
		};
	}

	if (!paymentIntentId) {
		throw new Error("Payment intent is required.");
	}

	const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

	if (paymentIntent.status !== "succeeded") {
		throw new Error("Payment has not completed yet.");
	}

	if (paymentIntent.metadata?.donationId !== donation._id.toString()) {
		throw new Error("Payment does not match this donation.");
	}

	const expectedAmount = Math.round(donation.amount * 100);
	if (paymentIntent.amount !== expectedAmount) {
		throw new Error("Payment amount mismatch.");
	}

	if (
		donation.stripePaymentIntentId &&
		donation.stripePaymentIntentId !== paymentIntent.id
	) {
		throw new Error("Donation is linked to a different payment.");
	}

	if (!donation.stripePaymentIntentId) {
		donation.stripePaymentIntentId = paymentIntent.id;
	}

	await applySuccessfulEventDonation(donation, {
		confirmedAt: new Date(paymentIntent.created * 1000),
	});

	const event = await CommunityEvent.findById(donation.eventId);
	return {
		donation,
		receipt: buildDonationReceipt(donation, event),
		event,
	};
}
