/**
 * Cloudflare Turnstile verification — skipped when TURNSTILE_SECRET_KEY is unset (local dev).
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export const verifyCaptcha = async (req, res, next) => {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		return next();
	}

	const token = req.body.captchaToken;
	if (!token) {
		return res.status(400).json({ message: "CAPTCHA verification required." });
	}

	try {
		const params = new URLSearchParams({
			secret,
			response: token,
		});

		const remoteIp =
			req.headers["cf-connecting-ip"] ||
			req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
			req.ip;
		if (remoteIp) {
			params.set("remoteip", remoteIp);
		}

		const verifyRes = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: params.toString(),
			},
		);

		const data = await verifyRes.json();
		if (!data.success) {
			return res.status(400).json({ message: "CAPTCHA verification failed." });
		}
		next();
	} catch (err) {
		console.error("Turnstile verify error:", err);
		res.status(500).json({ message: "CAPTCHA verification error." });
	}
};
