import { ALLOWED_SHIPPING_COUNTRIES } from "../constants/platformPolicy.js";

const LAUNCH_ALIASES = new Set(
	ALLOWED_SHIPPING_COUNTRIES.map(country => country.toLowerCase()),
);

export const isUkCountry = country => {
	if (!country) return false;
	return LAUNCH_ALIASES.has(String(country).trim().toLowerCase());
};

export const assertUkShipping = (address, res) => {
	if (!address?.country || !isUkCountry(address.country)) {
		res?.status?.(400)?.json?.({
			message:
				"Angelpage ships to the United States, Canada, and the United Kingdom. We started in the United States.",
		});
		return false;
	}
	return true;
};

export const currencyForCountry = country => {
	const normalized = String(country || "").trim().toLowerCase();
	if (normalized === "canada" || normalized === "ca") return "cad";
	if (
		normalized === "united kingdom" ||
		normalized === "uk" ||
		normalized === "great britain" ||
		normalized === "gb" ||
		normalized === "england" ||
		normalized === "scotland" ||
		normalized === "wales" ||
		normalized === "northern ireland"
	) {
		return "gbp";
	}
	return "usd";
};

export const DEFAULT_COUNTRY = "United States";
