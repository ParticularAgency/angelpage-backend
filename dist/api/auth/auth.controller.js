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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkToken = exports.fetchCharityProfile = exports.fetchUserProfile = exports.deleteAccount = exports.resetPassword = exports.requestPasswordReset = exports.loginUser = exports.resendVerificationEmail = exports.verifyEmail = exports.registerUser = void 0;
// import { Request, Response } from "express";
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const email_1 = require("../../utils/email");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
// Utility to generate a token
const generateToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_SECRET, { expiresIn: "30m" });
};
// Utility to compare passwords
const comparePassword = (password, hashedPassword) => __awaiter(void 0, void 0, void 0, function* () {
    return bcryptjs_1.default.compare(password, hashedPassword);
});
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a random 6-digit number
};
// Register User
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { role, firstName, lastName, email } = _a, userData = __rest(_a, ["role", "firstName", "lastName", "email"]);
        const name = `${firstName || ""} ${lastName || ""}`.trim();
        const isEmailTaken = (yield User_model_1.default.findOne({ email })) ||
            (yield Charity_model_1.default.findOne({ email })) ||
            (yield Admin_model_1.default.findOne({ email }));
        if (isEmailTaken) {
            return res.status(400).json({
                message: `This email is already in use for the ${isEmailTaken.role} role.`,
            });
        }
        let newUser;
        switch (role) {
            case "USER":
                newUser = new User_model_1.default(Object.assign(Object.assign({}, userData), { firstName, lastName, name, email, role }));
                break;
            case "CHARITY":
                newUser = new Charity_model_1.default(Object.assign(Object.assign({}, userData), { firstName, lastName, name, email, role }));
                break;
            case "ADMIN":
                newUser = new Admin_model_1.default(Object.assign(Object.assign({}, userData), { firstName, lastName, email, role }));
                break;
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
        // Generate a 6-digit verification code
        const verificationCode = generateVerificationCode();
        const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // Expire in 15 minutes
        newUser.verificationCode = verificationCode;
        newUser.verificationExpiry = verificationExpiry;
        yield newUser.save();
        // Send email verification link
        yield (0, email_1.sendVerificationEmail)({
            email: newUser.email,
            firstName,
            verificationCode,
        });
        // Send welcome email
        yield (0, email_1.sendWelcomeEmail)({
            email: newUser.email,
            firstName: newUser.firstName,
            userId: newUser._id.toString(),
            role: newUser.role,
        });
        const token = jsonwebtoken_1.default.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "15m" });
        res.status(201).json({
            message: "Registration successful. Please verify your email.",
            user: newUser,
            token,
        });
    }
    catch (error) {
        console.error("Error during registration:", error);
        res
            .status(500)
            .json({ message: "Registration failed", error: error.message });
    }
});
exports.registerUser = registerUser;
// Verify Email (Handle Expired Codes by Allowing Resend)
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, verificationCode, role } = req.body;
        console.log(`Verification attempt for email: ${email} with code: ${verificationCode}`);
        // Find user by email, explicitly selecting verification fields
        const user = (yield User_model_1.default.findOne({ email }).select('+verificationCode +verificationExpiry')) ||
            (yield Charity_model_1.default.findOne({ email }).select('+verificationCode +verificationExpiry')) ||
            (yield Admin_model_1.default.findOne({ email }).select('+verificationCode +verificationExpiry'));
        if (!user) {
            console.log(`User with email: ${email} not found.`);
            return res.status(404).json({ message: "User not found." });
        }
        // Log retrieved verification fields
        console.log(`Stored code: ${user.verificationCode}, Entered code: ${verificationCode}`);
        console.log(`Stored expiry: ${user.verificationExpiry}, Current time: ${new Date()}`);
        // Check if the verification code matches and has not expired
        if (!user.verificationCode || user.verificationCode !== verificationCode) {
            console.log("Verification code mismatch or undefined.");
            return res.status(400).json({ message: "Invalid verification code." });
        }
        if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
            console.log("Verification code has expired.");
            return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
        }
        // Update user's verified status
        user.verified = true;
        user.verificationCode = undefined;
        user.verificationExpiry = undefined;
        yield user.save();
        // Send verification completion email
        yield (0, email_1.sendEmail)({
            to: user.email,
            subject: "Email Verification Completed",
            text: `Hello ${user.firstName}, your email verification is complete.`,
        });
        res.status(200).json({ message: "Email verified successfully." });
    }
    catch (error) {
        console.error("Error verifying email:", error);
        res.status(400).json({ message: "Error verifying email." });
    }
});
exports.verifyEmail = verifyEmail;
// Resend Verification Code
const resendVerificationEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        console.log(`Resending verification email for: ${email}`);
        // Find user by email
        const user = (yield User_model_1.default.findOne({ email })) ||
            (yield Charity_model_1.default.findOne({ email })) ||
            (yield Admin_model_1.default.findOne({ email }));
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Generate a new verification code
        const verificationCode = generateVerificationCode();
        user.verificationCode = verificationCode;
        user.verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiry
        yield user.save();
        // Send the new verification code
        yield (0, email_1.sendVerificationEmail)({
            email: user.email,
            firstName: user.firstName,
            verificationCode,
        });
        console.log(`Verification code resent to: ${email}`);
        res.status(200).json({ message: "Verification code resent successfully." });
    }
    catch (error) {
        console.error("Error resending verification email:", error);
        res.status(500).json({ message: "Failed to resend verification code." });
    }
});
exports.resendVerificationEmail = resendVerificationEmail;
// Login User
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, role } = req.body;
        // Retrieve the user based on role
        let user;
        switch (role) {
            case "USER":
                user = yield User_model_1.default.findOne({ email });
                break;
            case "CHARITY":
                user = yield Charity_model_1.default.findOne({ email });
                break;
            case "ADMIN":
                user = yield Admin_model_1.default.findOne({ email });
                break;
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Compare the password using bcrypt
        const isMatch = yield comparePassword(password, user.password);
        console.log("Login Attempt Debug:", {
            inputPassword: password,
            storedHashedPassword: user.password,
            isMatch,
        });
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Generate a JWT token
        const token = generateToken(user._id.toString(), user.role);
        // Send welcome back email
        const now = new Date();
        if (!user.lastWelcomeBackEmailSent ||
            now.getTime() - user.lastWelcomeBackEmailSent.getTime() >
                24 * 60 * 60 * 1000) {
            yield (0, email_1.sendWelcomeBackEmail)({
                email: user.email,
                firstName: user.firstName,
            });
            // Update the timestamp for the last email sent
            user.lastWelcomeBackEmailSent = now;
            yield user.save();
        }
        res.status(200).json({ message: "Login successful", user, token });
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});
exports.loginUser = loginUser;
// Send Password Reset Email
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, role } = req.body;
    try {
        let user;
        switch (role) {
            case "USER":
                user = yield User_model_1.default.findOne({ email });
                break;
            case "CHARITY":
                user = yield Charity_model_1.default.findOne({ email });
                break;
            case "ADMIN":
                user = yield Admin_model_1.default.findOne({ email });
                break;
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Create a reset token with a short expiration (e.g., 15 minutes)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "10m" });
        yield (0, email_1.sendPasswordResetEmail)({
            email: user.email,
            resetToken,
            firstName: user.firstName,
        });
        res.json({ message: "Password reset email sent" });
    }
    catch (error) {
        console.error("Error sending password reset email:", error);
        res.status(500).json({ message: "Failed to send password reset email" });
    }
});
exports.requestPasswordReset = requestPasswordReset;
// Reset Password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { userId, role } = decoded;
        let user;
        switch (role) {
            case "USER":
                user = yield User_model_1.default.findById(userId);
                break;
            case "CHARITY":
                user = yield Charity_model_1.default.findById(userId);
                break;
            case "ADMIN":
                user = yield Admin_model_1.default.findById(userId);
                break;
            default:
                return res.status(400).json({ message: "Invalid role specified." });
        }
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Directly update the password, Mongoose middleware will handle hashing
        user.password = newPassword;
        yield user.save();
        // Send password reset completion email
        yield (0, email_1.sendPasswordResetCompletionEmail)({
            email: user.email,
            firstName: user.firstName,
        });
        console.log("Password updated successfully for user:", userId);
        res.status(200).json({ message: "Password reset successful." });
    }
    catch (error) {
        console.error("Error resetting password:", error);
        res.status(400).json({ message: "Invalid or expired reset token." });
    }
});
exports.resetPassword = resetPassword;
// Delete Account
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, role } = req.body;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }
    try {
        let userModel;
        switch (role) {
            case "USER":
                userModel = User_model_1.default;
                break;
            case "CHARITY":
                userModel = Charity_model_1.default;
                break;
            case "ADMIN":
                userModel = Admin_model_1.default;
                break;
            default:
                return res.status(400).json({ message: "Invalid role specified" });
        }
        const user = yield userModel.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "Account deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting account:", error);
        res
            .status(500)
            .json({ message: "Failed to delete account", error: error.message });
    }
});
exports.deleteAccount = deleteAccount;
// Fetch User Profile Data
const fetchUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.params;
        // Find user by email
        const user = (yield User_model_1.default.findOne({ email })) ||
            (yield Charity_model_1.default.findOne({ email })) ||
            (yield Admin_model_1.default.findOne({ email }));
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Calculate profile completion percentage
        const fields = [
            "firstName",
            "lastName",
            "email",
            "userName",
            "dateBirth",
            "profileImage",
            "addresses",
            "payments",
        ];
        let fieldsCompleted = 0;
        fields.forEach(field => {
            if (Array.isArray(user[field])) {
                if (user[field] && user[field].length > 0)
                    fieldsCompleted++;
            }
            else {
                if (user[field])
                    fieldsCompleted++;
            }
        });
        const totalFields = fields.length;
        const profileCompletionPercentage = (fieldsCompleted / totalFields) * 100;
        const profileCompleted = profileCompletionPercentage === 100;
        // Update the profileCompleted property if necessary
        if (user.profileCompleted !== profileCompleted) {
            user.profileCompleted = profileCompleted;
            yield user.save();
        }
        // Return user profile data without sensitive information like password or verification codes
        const _a = user.toObject(), { password, verificationCode, verificationExpiry } = _a, profileData = __rest(_a, ["password", "verificationCode", "verificationExpiry"]);
        res.status(200).json({
            user: profileData,
            profileCompletionPercentage,
        });
    }
    catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error fetching user data." });
    }
});
exports.fetchUserProfile = fetchUserProfile;
const fetchCharityProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.params;
        // Find user by email
        const user = (yield User_model_1.default.findOne({ email })) ||
            (yield Charity_model_1.default.findOne({ email })) ||
            (yield Admin_model_1.default.findOne({ email }));
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Calculate profile completion percentage
        const fields = [
            "firstName",
            "lastName",
            "charityName",
            "charityNumber",
            "charityID",
            "email",
            "userName",
            "profileImage",
            "addresses",
            "payments",
        ];
        let fieldsCompleted = 0;
        fields.forEach(field => {
            if (Array.isArray(user[field])) {
                if (user[field] && user[field].length > 0)
                    fieldsCompleted++;
            }
            else {
                if (user[field])
                    fieldsCompleted++;
            }
        });
        const totalFields = fields.length;
        const profileCompletionPercentage = (fieldsCompleted / totalFields) * 100;
        const profileCompleted = profileCompletionPercentage === 100;
        // Update the profileCompleted property if necessary
        if (user.profileCompleted !== profileCompleted) {
            user.profileCompleted = profileCompleted;
            yield user.save();
        }
        // Return user profile data without sensitive information like password or verification codes
        const _a = user.toObject(), { password, verificationCode, verificationExpiry } = _a, profileData = __rest(_a, ["password", "verificationCode", "verificationExpiry"]);
        res.status(200).json({
            user: profileData,
            profileCompletionPercentage,
        });
    }
    catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error fetching user data." });
    }
});
exports.fetchCharityProfile = fetchCharityProfile;
// Endpoint to check if the token is valid
const checkToken = (req, res) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    const token = authHeader.replace("Bearer ", "");
    try {
        // Verify the token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if token has expired (optional, since jwt.verify does this)
        if (Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ message: "Token has expired." });
        }
        // Token is valid, send success response
        return res.status(200).json({ message: "Token is valid." });
    }
    catch (error) {
        console.error("Token validation error:", error.message);
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};
exports.checkToken = checkToken;
