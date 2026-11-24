"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_ALLOWED_UPDATE = void 0;
exports.generateGuestOrderToken = generateGuestOrderToken;
exports.hashGuestOrderToken = hashGuestOrderToken;
exports.verifyGuestOrderToken = verifyGuestOrderToken;
exports.extractGuestToken = extractGuestToken;
exports.assertGuestMayUpdateFields = assertGuestMayUpdateFields;
const crypto_1 = __importDefault(require("crypto"));
function generateGuestOrderToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
function hashGuestOrderToken(token) {
    return crypto_1.default.createHash("sha256").update(String(token)).digest("hex");
}
function verifyGuestOrderToken(token, storedHash) {
    if (!token || !storedHash)
        return false;
    try {
        const candidate = hashGuestOrderToken(token);
        const a = Buffer.from(candidate, "hex");
        const b = Buffer.from(storedHash, "hex");
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
    catch (_a) {
        return false;
    }
}
function extractGuestToken(req) {
    var _a, _b;
    return (((_a = req.body) === null || _a === void 0 ? void 0 : _a.guestToken) ||
        ((_b = req.query) === null || _b === void 0 ? void 0 : _b.guestToken) ||
        req.header("X-Guest-Order-Token") ||
        null);
}
/** Guest checkout may only update payment-related fields */
exports.GUEST_ALLOWED_UPDATE = {
    statuses: new Set(["OrderPlaced", "OrderConfirmed"]),
    paymentStatuses: new Set(["Pending", "Paid", "Failed"]),
};
function assertGuestMayUpdateFields(body) {
    const { status, orderStatus, paymentStatus } = body;
    if (status && !exports.GUEST_ALLOWED_UPDATE.statuses.has(status)) {
        return `Guest cannot set status to ${status}`;
    }
    if (orderStatus && !exports.GUEST_ALLOWED_UPDATE.statuses.has(orderStatus)) {
        return `Guest cannot set orderStatus to ${orderStatus}`;
    }
    if (paymentStatus && !exports.GUEST_ALLOWED_UPDATE.paymentStatuses.has(paymentStatus)) {
        return `Guest cannot set paymentStatus to ${paymentStatus}`;
    }
    return null;
}
