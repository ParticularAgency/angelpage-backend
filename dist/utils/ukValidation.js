"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COUNTRY = exports.currencyForCountry = exports.assertUkShipping = exports.isUkCountry = void 0;
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
const LAUNCH_ALIASES = new Set(platformPolicy_js_1.ALLOWED_SHIPPING_COUNTRIES.map(country => country.toLowerCase()));
const isUkCountry = country => {
    if (!country)
        return false;
    return LAUNCH_ALIASES.has(String(country).trim().toLowerCase());
};
exports.isUkCountry = isUkCountry;
const assertUkShipping = (address, res) => {
    var _a, _b, _c;
    if (!(address === null || address === void 0 ? void 0 : address.country) || !(0, exports.isUkCountry)(address.country)) {
        (_c = (_b = (_a = res === null || res === void 0 ? void 0 : res.status) === null || _a === void 0 ? void 0 : _a.call(res, 400)) === null || _b === void 0 ? void 0 : _b.json) === null || _c === void 0 ? void 0 : _c.call(_b, {
            message: "Angelpage ships to the United States, Canada, and the United Kingdom. We started in the United States.",
        });
        return false;
    }
    return true;
};
exports.assertUkShipping = assertUkShipping;
const currencyForCountry = country => {
    const normalized = String(country || "").trim().toLowerCase();
    if (normalized === "canada" || normalized === "ca")
        return "cad";
    if (normalized === "united kingdom" ||
        normalized === "uk" ||
        normalized === "great britain" ||
        normalized === "gb" ||
        normalized === "england" ||
        normalized === "scotland" ||
        normalized === "wales" ||
        normalized === "northern ireland") {
        return "gbp";
    }
    return "usd";
};
exports.currencyForCountry = currencyForCountry;
exports.DEFAULT_COUNTRY = "United States";
