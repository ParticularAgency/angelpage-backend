import sgMail, { MailDataRequired } from "@sendgrid/mail";

// Initialize SendGrid with the API key
const sendGridApiKey = process.env.SENDGRID_API_KEY || "";
if (!sendGridApiKey) {
	throw new Error("SENDGRID_API_KEY is not set in environment variables.");
}
sgMail.setApiKey(sendGridApiKey);

interface EmailOptions {
	to: string; // Recipient email
	subject: string; // Email subject
	text?: string; // Plain text content (optional)
	html?: string; // HTML content (optional)
}

// General Send Email Function
export const sendEmail = async ({
	to,
	subject,
	text,
	html,
}: EmailOptions): Promise<void> => {
	const fromEmail = process.env.SENDGRID_FROM || "noreply@yourdomain.com"; // Verified sender email
	if (!fromEmail) {
		throw new Error("SENDGRID_FROM is not set in environment variables.");
	}

	const msg: MailDataRequired = {
		from: fromEmail,
		to,
		subject,
		text: text || "", // Default to an empty string if not provided
		html: html || "", // Default to an empty string if not provided
	};

	try {
		const response = await sgMail.send(msg);
		console.log(`Email sent successfully to ${to}:`, response[0].statusCode);
	} catch (error) {
		
			console.error("Error sending email:");
		
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
		}! Please complete your profile...`,
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
