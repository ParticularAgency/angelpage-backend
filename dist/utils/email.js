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
exports.sendPasswordResetCompletionEmail = exports.sendPasswordResetEmail = exports.sendWelcomeBackEmail = exports.sendVerificationEmail = exports.sendWelcomeEmail = exports.sendEmail = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
// Initialize SendGrid with the API key
const sendGridApiKey = process.env.SENDGRID_API_KEY || "";
if (!sendGridApiKey) {
    throw new Error("SENDGRID_API_KEY is not set in environment variables.");
}
mail_1.default.setApiKey(sendGridApiKey);
// General Send Email Function
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, text, html, }) {
    const fromEmail = process.env.SENDGRID_FROM || "noreply@yourdomain.com"; // Verified sender email
    if (!fromEmail) {
        throw new Error("SENDGRID_FROM is not set in environment variables.");
    }
    const msg = {
        from: fromEmail,
        to,
        subject,
        text: text || "", // Default to an empty string if not provided
        html: html || "", // Default to an empty string if not provided
    };
    try {
        const response = yield mail_1.default.send(msg);
        console.log(`Email sent successfully to ${to}:`, response[0].statusCode);
    }
    catch (error) {
        console.error("Error sending email:");
        throw new Error("Failed to send email");
    }
});
exports.sendEmail = sendEmail;
// Send Welcome Email
const sendWelcomeEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user.email)
        throw new Error("Email address is required");
    let rolePath;
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
    yield (0, exports.sendEmail)({
        to: user.email,
        subject: "Welcome to Our Platform",
        text: `Thank you for joining, ${user.firstName || "user"}! Please complete your profile...`,
        html: `<p>Thank you for joining, ${user.firstName || "user"}! <a href="${profileCompletionUrl}">Complete your profile</a>.</p>`,
    });
});
exports.sendWelcomeEmail = sendWelcomeEmail;
// Send Verification Email
const sendVerificationEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user.email || !user.verificationCode) {
        throw new Error("Email and verification code are required");
    }
    yield (0, exports.sendEmail)({
        to: user.email,
        subject: "Verify Your Account",
        text: `Please use the following code to verify your account: ${user.verificationCode}`,
        html: `<p>Hello ${user.firstName || "user"},</p>
           <p>Your verification code is: <strong>${user.verificationCode}</strong></p>
           <p>This code is valid for 15 minutes.</p>`,
    });
});
exports.sendVerificationEmail = sendVerificationEmail;
// Send Welcome Back Email
const sendWelcomeBackEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user.email)
        throw new Error("Email address is required");
    yield (0, exports.sendEmail)({
        to: user.email,
        subject: "Welcome Back to Our Platform",
        text: `Welcome back, ${user.firstName || "user"}! We're glad to see you again.`,
        html: `<p>Welcome back, ${user.firstName || "user"}! We're glad to see you again.</p>`,
    });
});
exports.sendWelcomeBackEmail = sendWelcomeBackEmail;
// Send Password Reset Email
const sendPasswordResetEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user.email || !user.resetToken)
        throw new Error("Email and reset token are required");
    const resetUrl = `${process.env.FRONTEND_BASE_URL}/auth/reset-password?token=${user.resetToken}`;
    yield (0, exports.sendEmail)({
        to: user.email,
        subject: "Reset Your Password",
        text: `Hello ${user.firstName || "user"},\n\nYou requested to reset your password. Please click the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
        html: `<p>Hello ${user.firstName || "user"},</p><p>You requested to reset your password. Please click the link below to reset your password:</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
    });
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
// Send Password Reset Completion Email
const sendPasswordResetCompletionEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user.email)
        throw new Error("Email address is required");
    yield (0, exports.sendEmail)({
        to: user.email,
        subject: "Password Reset Successful",
        text: `Hello ${user.firstName || "user"}, your password has been successfully reset.`,
        html: `<p>Hello ${user.firstName || "user"},</p><p>Your password has been successfully reset. If you did not perform this action, please contact support immediately.</p>`,
    });
});
exports.sendPasswordResetCompletionEmail = sendPasswordResetCompletionEmail;
