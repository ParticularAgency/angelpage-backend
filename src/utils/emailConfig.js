/**
 * Email / URL configuration checks — log warnings at startup.
 */
export function validateEmailConfig() {
	const warnings = [];

	if (!process.env.SENDGRID_API_KEY) {
		warnings.push("SENDGRID_API_KEY is not set — emails will fail.");
	}

	const from = process.env.SENDGRID_FROM || "";
	if (!from) {
		warnings.push("SENDGRID_FROM is not set.");
	} else if (from.includes("byparticular.com") || from.includes("localhost")) {
		warnings.push(
			`SENDGRID_FROM=${from} — use a verified sender on angelpage.co.uk (e.g. noreply@angelpage.co.uk).`,
		);
	}

	const frontend = process.env.FRONTEND_BASE_URL || "";
	if (!frontend) {
		warnings.push("FRONTEND_BASE_URL is not set — email links will be broken.");
	} else if (frontend.includes("localhost")) {
		warnings.push(
			`FRONTEND_BASE_URL=${frontend} — password reset links point to localhost in production.`,
		);
	}

	if (warnings.length) {
		console.warn("\n[Angelpage Email Config]\n" + warnings.map(w => `  ⚠ ${w}`).join("\n") + "\n");
	}

	return warnings;
}
