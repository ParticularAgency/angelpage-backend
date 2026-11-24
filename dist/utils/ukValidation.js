"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COUNTRY = exports.assertUkShipping = exports.isUkCountry = void 0;
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
const UK_ALIASES = new Set([
    "uk",
    "gb",
    "united kingdom",
    "great britain",
    "england",
    "scotland",
    "wales",
    "northern ireland",
    ...platformPolicy_js_1.ALLOWED_SHIPPING_COUNTRIES.map(c => c.toLowerCase()),
].map(s => s.toLowerCase()));
const isUkCountry = country => {
    if (!country)
        return false;
    return UK_ALIASES.has(String(country).trim().toLowerCase());
};
exports.isUkCountry = isUkCountry;
const assertUkShipping = (address, res) => {
    var _a, _b, _c;
    if (!(address === null || address === void 0 ? void 0 : address.country) || !(0, exports.isUkCountry)(address.country)) {
        (_c = (_b = (_a = res === null || res === void 0 ? void 0 : res.status) === null || _a === void 0 ? void 0 : _a.call(res, 400)) === null || _b === void 0 ? void 0 : _b.json) === null || _c === void 0 ? void 0 : _c.call(_b, {
            message: "Angelpage currently supports UK shipping addresses only.",
        });
        return false;
    }
    return true;
};
exports.assertUkShipping = assertUkShipping;
exports.DEFAULT_COUNTRY = "United Kingdom";
