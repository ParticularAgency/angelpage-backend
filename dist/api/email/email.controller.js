"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactUs = exports.subscribe = void 0;
const Subscriber_model_1 = __importDefault(require("../../models/Subscriber.model")); // Ensure Subscription model exists
const email_1 = require("../../utils/email"); // Service for SendGrid
// import {
// 	// writeSubscriptionToExcel,
// 	writeSubscriptionToGoogleSheet,
// } from "./excelService"; // Services for writing to files
// Subscribe and send welcome email
const subscribe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    try {
        // Check if email is already subscribed
        const existingSubscription = yield Subscriber_model_1.default.findOne({ email });
        if (existingSubscription) {
            return res.status(400).json({ message: "Email already subscribed" });
        }
        // Save subscription to the database
        const subscription = new Subscriber_model_1.default({ email });
        yield subscription.save();
        // Send welcome email using SendGrid
        yield (0, email_1.sendSubsThanksEmail)(email);
        // Write subscription to Excel (or Google Sheets)
        // await writeSubscriptionToExcel(email); 
        // await writeSubscriptionToGoogleSheet(email); 
        res.status(200).json({ message: "Subscription successful" });
    }
    catch (error) {
        console.error("Error subscribing:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.subscribe = subscribe;
const contactUs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, email, phone, message } = req.body;
    if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@yourdomain.com";
        // Send email to the admin
        yield (0, email_1.sendContactEmail)({
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
    }
    catch (error) {
        console.error("Error handling contact message:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
exports.contactUs = contactUs;
