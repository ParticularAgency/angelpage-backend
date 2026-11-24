import rateLimit from "express-rate-limit";

const parsePositiveInt = (value, fallback) => {
	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const defaultWindowMs = parsePositiveInt(
	process.env.RATE_LIMIT_WINDOW_MS,
	15 * 60 * 1000
);

export const apiRateLimiter = rateLimit({
	windowMs: defaultWindowMs,
	max: parsePositiveInt(process.env.RATE_LIMIT_MAX, 300),
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many requests. Please try again later.",
	},
});

export const authRateLimiter = rateLimit({
	windowMs: defaultWindowMs,
	max: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 25),
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many authentication attempts. Please try again later.",
	},
});

export const writeRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: parsePositiveInt(process.env.RATE_LIMIT_WRITE_MAX, 40),
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many write requests. Please slow down.",
	},
});
