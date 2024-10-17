// src/api/email/email.service.ts
import nodemailer from "nodemailer";

export const sendWelcomeEmail = (email: string, role: string) => {
	const transporter = nodemailer.createTransport({
		service: "Gmail",
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD,
		},
	});

	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to: email,
		subject: `Welcome to the platform!`,
		text: `Thank you for registering as a ${role}. Please complete your profile.`,
	};

	transporter.sendMail(mailOptions, (err, info) => {
		if (err) {
			console.error("Error sending email:", err);
		} else {
			console.log("Welcome email sent:", info.response);
		}
	});
};

export const sendWelcomeBackEmail = (email: string) => {
	// Implement welcome back email logic
};
