"use strict";
/**
 * Marketing journey triggers — transactional (SendGrid) + automation (Brevo / Customer.io).
 *
 * Env:
 *   BREVO_API_KEY          — Brevo (Sendinblue) automation events
 *   CUSTOMERIO_SITE_ID     — Customer.io site id
 *   CUSTOMERIO_API_KEY     — Customer.io track API key
 *   MARKETING_WEBHOOK_URL  — Generic webhook for any ESP
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOURNEY_EVENTS = void 0;
exports.triggerMarketingEvent = triggerMarketingEvent;
exports.fireMarketingEvent = fireMarketingEvent;
const PROVIDER = process.env.MARKETING_PROVIDER || "brevo";
function postBrevoEvent(eventName_1, email_1) {
    return __awaiter(this, arguments, void 0, function* (eventName, email, properties = {}) {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            return { skipped: true, reason: "BREVO_API_KEY not configured" };
        }
        const res = yield fetch("https://api.brevo.com/v3/events", {
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
            const err = yield res.text();
            throw new Error(`Brevo event failed: ${err}`);
        }
        return { success: true, provider: "brevo" };
    });
}
function postCustomerIoEvent(eventName_1, email_1) {
    return __awaiter(this, arguments, void 0, function* (eventName, email, properties = {}) {
        const siteId = process.env.CUSTOMERIO_SITE_ID;
        const apiKey = process.env.CUSTOMERIO_API_KEY;
        if (!siteId || !apiKey) {
            return { skipped: true, reason: "Customer.io credentials not configured" };
        }
        const auth = Buffer.from(`${siteId}:${apiKey}`).toString("base64");
        const res = yield fetch(`https://track.customer.io/api/v1/customers/${encodeURIComponent(email)}/events`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: eventName, data: properties }),
        });
        if (!res.ok) {
            const err = yield res.text();
            throw new Error(`Customer.io event failed: ${err}`);
        }
        return { success: true, provider: "customerio" };
    });
}
function postGenericWebhook(eventName_1, email_1) {
    return __awaiter(this, arguments, void 0, function* (eventName, email, properties = {}) {
        const url = process.env.MARKETING_WEBHOOK_URL;
        if (!url) {
            return { skipped: true, reason: "MARKETING_WEBHOOK_URL not configured" };
        }
        const res = yield fetch(url, {
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
            const err = yield res.text();
            throw new Error(`Marketing webhook failed: ${err}`);
        }
        return { success: true, provider: "webhook" };
    });
}
/**
 * Fire-and-forget journey event. Never throws to callers.
 */
function triggerMarketingEvent(eventName, _a) {
    return __awaiter(this, void 0, void 0, function* () {
        var { email } = _a, properties = __rest(_a, ["email"]);
        if (!email) {
            return { skipped: true, reason: "No email" };
        }
        try {
            let result;
            if (PROVIDER === "customerio") {
                result = yield postCustomerIoEvent(eventName, email, properties);
            }
            else if (PROVIDER === "webhook") {
                result = yield postGenericWebhook(eventName, email, properties);
            }
            else {
                result = yield postBrevoEvent(eventName, email, properties);
            }
            if (result.skipped && process.env.MARKETING_WEBHOOK_URL) {
                result = yield postGenericWebhook(eventName, email, properties);
            }
            return result;
        }
        catch (err) {
            console.error(`Marketing event [${eventName}] failed:`, err.message);
            return { success: false, error: err.message };
        }
    });
}
/** Canonical Angelpage journey events */
exports.JOURNEY_EVENTS = {
    USER_REGISTERED: "user.registered",
    ORDER_PAID: "order.paid",
    ORDER_SHIPPED: "order.shipped",
    ORDER_DELIVERED: "order.delivered",
    ESCROW_RELEASED: "escrow.released",
    PRODUCT_APPROVED: "product.approved",
    ABANDONED_CART: "cart.abandoned",
    SELLER_INACTIVE: "seller.inactive",
};
function fireMarketingEvent(eventName, payload) {
    triggerMarketingEvent(eventName, payload).catch(() => { });
}
