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
exports.releaseEscrowForOrder = releaseEscrowForOrder;
exports.processDueEscrowReleases = processDueEscrowReleases;
exports.startEscrowAutoReleaseJob = startEscrowAutoReleaseJob;
const Order_model_1 = __importDefault(require("../models/Order.model"));
const marketingJourneys_service_1 = require("./marketingJourneys.service");
const email_1 = require("../utils/email");
/**
 * Release escrow for a single order (manual admin or auto-release job).
 */
function releaseEscrowForOrder(orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const order = yield Order_model_1.default.findById(orderId).populate("buyerId", "email firstName");
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
        yield order.save();
        const buyerEmail = order.isGuestOrder
            ? order.guestEmail
            : (_a = order.buyerId) === null || _a === void 0 ? void 0 : _a.email;
        const firstName = order.isGuestOrder
            ? (_b = order.guestName) === null || _b === void 0 ? void 0 : _b.split(" ")[0]
            : (_c = order.buyerId) === null || _c === void 0 ? void 0 : _c.firstName;
        if (buyerEmail) {
            try {
                yield (0, email_1.sendEscrowReleasedEmail)({
                    email: buyerEmail,
                    firstName: firstName || "there",
                    orderId: order._id.toString(),
                    grandTotal: order.grandTotal,
                });
            }
            catch (emailErr) {
                console.error("Escrow release email failed:", emailErr);
            }
            (0, marketingJourneys_service_1.fireMarketingEvent)(marketingJourneys_service_1.JOURNEY_EVENTS.ESCROW_RELEASED, {
                email: buyerEmail,
                orderId: order._id.toString(),
                grandTotal: order.grandTotal,
            });
        }
        return { released: true, orderId: order._id.toString() };
    });
}
function processDueEscrowReleases() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const orders = yield Order_model_1.default.find({
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
                const result = yield releaseEscrowForOrder(order._id);
                if (result.released)
                    released += 1;
            }
            catch (err) {
                console.error("Auto escrow release failed:", order._id, err.message);
            }
        }
        return { released, scanned: orders.length };
    });
}
const HOUR_MS = 60 * 60 * 1000;
function startEscrowAutoReleaseJob() {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const { released, scanned } = yield processDueEscrowReleases();
            if (released > 0) {
                console.log(`Escrow auto-release: ${released}/${scanned} order(s) released`);
            }
        }
        catch (err) {
            console.error("Escrow auto-release job error:", err);
        }
    });
    run();
    setInterval(run, HOUR_MS);
}
