import { Request, Response } from "express";
import Subscription from "../../models/Subscriber.model"; // Ensure Subscription model exists
import { sendSubsThanksEmail, sendContactEmail } from "../../utils/email"; // Service for SendGrid
// import {
// 	// writeSubscriptionToExcel,
// 	writeSubscriptionToGoogleSheet,
// } from "./excelService"; // Services for writing to files

// Subscribe and send welcome email
export const subscribe = async (req: Request, res: Response) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).json({ message: "Email is required" });
	}

	try {
		// Check if email is already subscribed
		const existingSubscription = await Subscription.findOne({ email });
		if (existingSubscription) {
			return res.status(400).json({ message: "Email already subscribed" });
		}

		// Save subscription to the database
		const subscription = new Subscription({ email });
		await subscription.save();

		// Send welcome email using SendGrid
		await sendSubsThanksEmail(email);

		// Write subscription to Excel (or Google Sheets)
		// await writeSubscriptionToExcel(email); 
		// await writeSubscriptionToGoogleSheet(email); 

		res.status(200).json({ message: "Subscription successful" });
	} catch (error) {
		console.error("Error subscribing:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};


export const contactUs = async (req: Request, res: Response) => {
	const { firstName, lastName, email, phone, message } = req.body;

	if (!firstName || !lastName || !email || !message) {
		return res.status(400).json({ message: "All fields are required." });
	}

	try {
		const adminEmail = process.env.ADMIN_EMAIL || "admin@yourdomain.com";

		// Send email to the admin
		await sendContactEmail({
			to: adminEmail,
			subject: "New Contact Message from AngelPage",
			text: `You have received a new message from the contact form:

      Name: ${firstName} ${lastName}
      Email: ${email}
      Phone: ${phone || "N/A"}

      Message:
      ${message}`,
			html: `
        <p>You have received a new message from the contact form:</p>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
		});

		res.status(200).json({ message: "Contact message sent successfully!" });
	} catch (error) {
		console.error("Error handling contact message:", error);
		res.status(500).json({ message: "Internal server error." });
	}
};