/** Platform policy constants — align with PRD / stakeholder decisions */

export const ESCROW_HOLD_DAYS = 14;
export const ALLOWED_SHIPPING_COUNTRIES = [
	"United States",
	"USA",
	"US",
	"United States of America",
	"Canada",
	"CA",
	"United Kingdom",
	"UK",
	"Great Britain",
	"GB",
	"England",
	"Scotland",
	"Wales",
	"Northern Ireland",
];
export const DEFAULT_COUNTRY = "United States";
export const TANGIBLE_PRODUCTS_ONLY = true;
export const CHARITY_SHARE_PERCENT = 90;
export const CHARITY_SHARE_RATE = CHARITY_SHARE_PERCENT / 100;
export const PLATFORM_FEE_RATE = 1 - CHARITY_SHARE_RATE;
