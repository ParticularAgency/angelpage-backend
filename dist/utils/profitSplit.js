"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARITY_SHARE_RATE = exports.PLATFORM_FEE_RATE = void 0;
exports.calculateProfitSplit = calculateProfitSplit;
exports.defaultCharityProfit = defaultCharityProfit;
exports.roundMoney = roundMoney;
const platformPolicy_js_1 = require("../constants/platformPolicy.js");
Object.defineProperty(exports, "PLATFORM_FEE_RATE", { enumerable: true, get: function () { return platformPolicy_js_1.PLATFORM_FEE_RATE; } });
Object.defineProperty(exports, "CHARITY_SHARE_RATE", { enumerable: true, get: function () { return platformPolicy_js_1.CHARITY_SHARE_RATE; } });
/**
 * Split sale price: platform fee first, then seller vs charity on the remainder.
 * @param {number} price - Sale price in GBP
 * @param {number} sellerSharePercent - % of distributable (after platform fee) kept by seller (0–100)
 */
function calculateProfitSplit(price, sellerSharePercent = 0) {
    const numericPrice = Number(price) || 0;
    const pct = Math.min(100, Math.max(0, Number(sellerSharePercent) || 0));
    const platformFee = roundMoney(numericPrice * platformPolicy_js_1.PLATFORM_FEE_RATE);
    const distributable = roundMoney(numericPrice - platformFee);
    const sellerProfit = roundMoney(distributable * (pct / 100));
    const charityProfit = roundMoney(distributable - sellerProfit);
    const charitySharePercent = distributable > 0 ? roundMoney((charityProfit / distributable) * 100) : 100 - pct;
    return {
        platformFee,
        distributable,
        sellerProfit,
        charityProfit,
        sellerSharePercent: pct,
        charitySharePercent,
        platformFeePercent: Math.round(platformPolicy_js_1.PLATFORM_FEE_RATE * 100),
    };
}
/** Legacy default: 0% seller, 100% of distributable to charity (= 90% of price) */
function defaultCharityProfit(price) {
    return calculateProfitSplit(price, 0).charityProfit;
}
function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
}
