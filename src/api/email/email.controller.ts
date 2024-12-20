import { Request, Response } from "express";
import Subscription from "../../models/Subscriber.model"; // Ensure Subscription model exists
import { sendSubsThanksEmail } from "../../utils/email"; // Service for SendGrid
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
