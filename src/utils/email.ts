import sgMail from "@sendgrid/mail";

// Initialize SendGrid with the API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

interface EmailOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

// General Send Email Function
export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
	const msg: sgMail.MailDataRequired = {
		from: process.env.SENDGRID_FROM || "noreply@yourdomain.com", // Verified sender email
		to,
		subject,
		text: text || "This is a fallback text content.",
		html: html || "<p>This is a fallback HTML content.</p>",
	};

	try {
		console.log("Sending email with payload:", msg);
		const response = await sgMail.send(msg);
		console.log(`Email sent successfully to ${to}:`, response[0].statusCode);
	} catch (error: any) {
		console.error(
			"Error sending email:",
			error.response ? error.response.body.errors : error,
		);
		throw new Error("Failed to send email");
	}
};

// Send Welcome Email
export const sendWelcomeEmail = async (user: {
	email: string;
	firstName?: string;
	userId?: string;
	role: "USER" | "CHARITY" | "ADMIN";
}) => {
	if (!user.email) throw new Error("Email address is required");

	let rolePath: string;

	// Determine the URL path based on the role
	switch (user.role) {
		case "USER":
			rolePath = "user/account";
			break;
		case "CHARITY":
			rolePath = "charity/account";
			break;
		case "ADMIN":
			rolePath = "admin/account";
			break;
		default:
			throw new Error("Invalid role specified");
	}

	const profileCompletionUrl = `${process.env.FRONTEND_BASE_URL}/${rolePath}/${user.userId}`;

	await sendEmail({
		to: user.email,
		subject: "Welcome to Our Platform",
		text: `Thank you for joining, ${
			user.firstName || "user"
		}! Please complete your profile.`,
		html: `<p>Thank you for joining, ${
			user.firstName || "user"
		}! <a href="${profileCompletionUrl}">Complete your profile</a>.</p>`,
	});
};

// Send Verification Email
export const sendVerificationEmail = async (user: {
	email: string;
	firstName?: string;
	verificationCode: string;
}) => {
	if (!user.email || !user.verificationCode) {
		throw new Error("Email and verification code are required");
	}

	await sendEmail({
		to: user.email,
		subject: "Verify Your Account",
		text: `Please use the following code to verify your account: ${user.verificationCode}`,
		html: `<p>Hello ${user.firstName || "user"},</p>
           <p>Your verification code is: <strong>${
							user.verificationCode
						}</strong></p>
           <p>This code is valid for 15 minutes.</p>`,
	});
};

// Send Welcome Back Email
export const sendWelcomeBackEmail = async (user: {
	email: string;
	firstName?: string;
}) => {
	if (!user.email) throw new Error("Email address is required");

	await sendEmail({
		to: user.email,
		subject: "Welcome Back to Our Platform",
		text: `Welcome back, ${
			user.firstName || "user"
		}! We're glad to see you again.`,
		html: `<p>Welcome back, ${
			user.firstName || "user"
		}! We're glad to see you again.</p>`,
	});
};

// Send Password Reset Email
export const sendPasswordResetEmail = async (user: {
	email: string;
	resetToken: string;
	firstName?: string;
}) => {
	if (!user.email || !user.resetToken)
		throw new Error("Email and reset token are required");

	const resetUrl = `${process.env.FRONTEND_BASE_URL}/auth/reset-password?token=${user.resetToken}`;

	await sendEmail({
		to: user.email,
		subject: "Reset Your Password",
		text: `Hello ${
			user.firstName || "user"
		},\n\nYou requested to reset your password. Please click the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
		html: `<p>Hello ${
			user.firstName || "user"
		},</p><p>You requested to reset your password. Please click the link below to reset your password:</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
	});
};

// Send Password Reset Completion Email
export const sendPasswordResetCompletionEmail = async (user: {
	email: string;
	firstName?: string;
}) => {
	if (!user.email) throw new Error("Email address is required");

	await sendEmail({
		to: user.email,
		subject: "Password Reset Successful",
		text: `Hello ${
			user.firstName || "user"
		}, your password has been successfully reset.`,
		html: `<p>Hello ${
			user.firstName || "user"
		},</p><p>Your password has been successfully reset. If you did not perform this action, please contact support immediately.</p>`,
	});
};

export const sendSubsThanksEmail = async (email: string) => {
	if (!email) {
		throw new Error(
			"Email address is required for subscription thank you email.",
		);
	}

	try {
		await sendEmail({
			to: email,
			subject: "Welcome to AngelPage Community!",
			text: "Thank you for subscribing to AngelPage Community! We're excited to have you.",
			html: `
        <p>Thank you for subscribing to <strong>AngelPage Community</strong>!</p>
        <p>We're thrilled to have you join our community.</p>
        <p>Stay tuned for updates, exclusive offers, and much more!</p>
      `,
		});
		console.log("Subscription thank you email sent to:", email);
	} catch (error) {
		console.error("Error sending subscription thank you email:", error);
		throw new Error("Failed to send subscription thank you email.");
	}
};

export const sendContactEmail = async ({ to, subject, text, html }: EmailOptions) => {
	const msg: sgMail.MailDataRequired = {
		from: process.env.SENDGRID_FROM || "noreply@yourdomain.com",
		to,
		subject,
		text: text || "This is a fallback text content.",
		html: html || "<p>This is a fallback HTML content.</p>",
	};

	try {
		console.log("Sending email with payload:", msg);
		const response = await sgMail.send(msg);
		console.log(`Email sent successfully to ${to}:`, response[0].statusCode);
	} catch (error: any) {
		console.error(
			"Error sending email:",
			error.response ? error.response.body.errors : error,
		);
		throw new Error("Failed to send email");
	}
};
