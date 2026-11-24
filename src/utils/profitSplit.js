import {
	PLATFORM_FEE_RATE,
	CHARITY_SHARE_RATE,
} from "../constants/platformPolicy.js";

/**
 * Split sale price: platform fee first, then seller vs charity on the remainder.
 * @param {number} price - Sale price in GBP
 * @param {number} sellerSharePercent - % of distributable (after platform fee) kept by seller (0–100)
 */
export function calculateProfitSplit(price, sellerSharePercent = 0) {
	const numericPrice = Number(price) || 0;
	const pct = Math.min(100, Math.max(0, Number(sellerSharePercent) || 0));

	const platformFee = roundMoney(numericPrice * PLATFORM_FEE_RATE);
	const distributable = roundMoney(numericPrice - platformFee);
	const sellerProfit = roundMoney(distributable * (pct / 100));
	const charityProfit = roundMoney(distributable - sellerProfit);
	const charitySharePercent =
		distributable > 0 ? roundMoney((charityProfit / distributable) * 100) : 100 - pct;

	return {
		platformFee,
		distributable,
		sellerProfit,
		charityProfit,
		sellerSharePercent: pct,
		charitySharePercent,
		platformFeePercent: Math.round(PLATFORM_FEE_RATE * 100),
	};
}

/** Legacy default: 0% seller, 100% of distributable to charity (= 90% of price) */
export function defaultCharityProfit(price) {
	return calculateProfitSplit(price, 0).charityProfit;
}

export function roundMoney(value) {
	return Math.round(Number(value) * 100) / 100;
}

export { PLATFORM_FEE_RATE, CHARITY_SHARE_RATE };
