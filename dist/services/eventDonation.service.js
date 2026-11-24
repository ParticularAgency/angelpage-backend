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
exports.buildDonationReceipt = exports.resolveEventFunds = exports.DEFAULT_EVENT_FUNDS = void 0;
exports.createEventDonationCheckout = createEventDonationCheckout;
exports.applySuccessfulEventDonation = applySuccessfulEventDonation;
exports.applyFailedEventDonation = applyFailedEventDonation;
exports.confirmEventDonationPayment = confirmEventDonationPayment;
const EventDonation_model_1 = __importDefault(require("../models/EventDonation.model"));
const CommunityEvent_model_1 = __importDefault(require("../models/CommunityEvent.model"));
const Charity_model_1 = __importDefault(require("../models/Charity.model"));
const stripe_js_1 = require("../config/stripe.js");
const email_1 = require("../utils/email");
exports.DEFAULT_EVENT_FUNDS = [
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
const resolveEventFunds = (event) => {
    if (Array.isArray(event.fundAllocations) && event.fundAllocations.length > 0) {
        return event.fundAllocations;
    }
    return exports.DEFAULT_EVENT_FUNDS;
};
exports.resolveEventFunds = resolveEventFunds;
const generateDonationNumber = () => {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `EVT-DON-${stamp}-${rand}`;
};
const resolveCharityForEvent = (event) => __awaiter(void 0, void 0, void 0, function* () {
    if (event.charityId) {
        const charity = yield Charity_model_1.default.findById(event.charityId).select("charityName name email");
        if (charity) {
            return {
                charityId: charity._id,
                charityName: charity.charityName || charity.name || "Charity Partner",
            };
        }
    }
    if (event.authorRole === "CHARITY" && event.authorId) {
        const charity = yield Charity_model_1.default.findById(event.authorId).select("charityName name email");
        if (charity) {
            return {
                charityId: charity._id,
                charityName: charity.charityName || charity.name || "Charity Partner",
            };
        }
    }
    return { charityId: null, charityName: "Angelpage Community Fund" };
});
const buildDonationReceipt = (donation, event) => ({
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
    fundAllocations: (0, exports.resolveEventFunds)(event || {}),
});
exports.buildDonationReceipt = buildDonationReceipt;
function createEventDonationCheckout(_a) {
    return __awaiter(this, arguments, void 0, function* ({ eventId, amount, fundId, donorName, donorEmail, isAnonymous = false, donorUserId, }) {
        const event = yield CommunityEvent_model_1.default.findOne({
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
        if (!(donorEmail === null || donorEmail === void 0 ? void 0 : donorEmail.trim())) {
            throw new Error("Email is required for your donation receipt.");
        }
        const funds = (0, exports.resolveEventFunds)(event);
        const selectedFund = funds.find(f => f.id === fundId) || funds[0];
        if (!selectedFund) {
            throw new Error("Please select a valid fund.");
        }
        const { charityId, charityName } = yield resolveCharityForEvent(event);
        const displayName = isAnonymous || !(donorName === null || donorName === void 0 ? void 0 : donorName.trim())
            ? "Anonymous Angel"
            : donorName.trim();
        const donation = yield EventDonation_model_1.default.create({
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
        const paymentIntent = yield stripe_js_1.stripe.paymentIntents.create({
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
        yield donation.save();
        return {
            donation,
            event,
            clientSecret: paymentIntent.client_secret,
        };
    });
}
function applySuccessfulEventDonation(donation_1) {
    return __awaiter(this, arguments, void 0, function* (donation, { confirmedAt } = {}) {
        var _a;
        if (!donation) {
            throw new Error("Donation is required.");
        }
        if (donation.paymentStatus === "paid") {
            return donation;
        }
        donation.paymentStatus = "paid";
        donation.paidAt = confirmedAt || new Date();
        yield donation.save();
        yield CommunityEvent_model_1.default.findByIdAndUpdate(donation.eventId, {
            $inc: { donationRaised: donation.amount },
        });
        if (donation.charityId) {
            yield Charity_model_1.default.findByIdAndUpdate(donation.charityId, {
                $inc: { upcomingFunds: donation.amount },
            });
        }
        try {
            const event = yield CommunityEvent_model_1.default.findById(donation.eventId);
            const receipt = (0, exports.buildDonationReceipt)(donation, event);
            yield (0, email_1.sendEmail)({
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
            <tr><td style="padding:6px 0;">Date</td><td style="text-align:right;">${((_a = donation.paidAt) === null || _a === void 0 ? void 0 : _a.toLocaleDateString("en-GB")) || ""}</td></tr>
          </table>
          <p style="margin-top:24px;font-size:13px;color:#666;">Your gift is allocated to the selected fund and recorded on the event ledger.</p>
        </div>
      `,
            });
        }
        catch (emailErr) {
            console.error("Donation receipt email failed:", emailErr);
        }
        return donation;
    });
}
function applyFailedEventDonation(donation) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!donation)
            return null;
        donation.paymentStatus = "failed";
        yield donation.save();
        return donation;
    });
}
function confirmEventDonationPayment(donationId, paymentIntentId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const donation = yield EventDonation_model_1.default.findById(donationId);
        if (!donation) {
            throw new Error("Donation not found.");
        }
        if (donation.paymentStatus === "paid") {
            const event = yield CommunityEvent_model_1.default.findById(donation.eventId);
            return {
                donation,
                receipt: (0, exports.buildDonationReceipt)(donation, event),
                event,
            };
        }
        if (!paymentIntentId) {
            throw new Error("Payment intent is required.");
        }
        const paymentIntent = yield stripe_js_1.stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            throw new Error("Payment has not completed yet.");
        }
        if (((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.donationId) !== donation._id.toString()) {
            throw new Error("Payment does not match this donation.");
        }
        const expectedAmount = Math.round(donation.amount * 100);
        if (paymentIntent.amount !== expectedAmount) {
            throw new Error("Payment amount mismatch.");
        }
        if (donation.stripePaymentIntentId &&
            donation.stripePaymentIntentId !== paymentIntent.id) {
            throw new Error("Donation is linked to a different payment.");
        }
        if (!donation.stripePaymentIntentId) {
            donation.stripePaymentIntentId = paymentIntent.id;
        }
        yield applySuccessfulEventDonation(donation, {
            confirmedAt: new Date(paymentIntent.created * 1000),
        });
        const event = yield CommunityEvent_model_1.default.findById(donation.eventId);
        return {
            donation,
            receipt: (0, exports.buildDonationReceipt)(donation, event),
            event,
        };
    });
}
