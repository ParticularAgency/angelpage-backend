"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.claimGuestOrders = exports.oauthLogin = exports.refreshAccessToken = exports.checkToken = exports.fetchCharityProfile = exports.fetchUserProfile = exports.deleteAccount = exports.resetPassword = exports.requestPasswordReset = exports.loginUser = exports.resendVerificationEmail = exports.verifyEmail = exports.registerUser = void 0;
// import { Request, Response } from "express";
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = __importDefault(require("../../models/User.model"));
const Charity_model_1 = __importDefault(require("../../models/Charity.model"));
const CharityStaff_model_1 = __importDefault(require("../../models/CharityStaff.model"));
const adminPermissions_js_1 = require("../../constants/adminPermissions.js");
const charityPermissions_js_1 = require("../../constants/charityPermissions.js");
const Admin_model_1 = __importDefault(require("../../models/Admin.model"));
const LoginActivity_model_1 = __importDefault(require("../../models/LoginActivity.model"));
const email_1 = require("../../utils/email");
const adminRoles_js_1 = require("../../constants/adminRoles.js");
const marketingJourneys_service_js_1 = require("../../services/marketingJourneys.service.js");
const guestOrderLink_service_js_1 = require("../../services/guestOrderLink.service.js");
const jwtSecret_js_1 = require("../../config/jwtSecret.js");
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "30m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const generateAccessToken = (userId, role, extra = {}) => jsonwebtoken_1.default.sign(Object.assign({ userId, role, type: "access" }, extra), jwtSecret_js_1.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
});
const generateRefreshToken = (userId, role, extra = {}) => jsonwebtoken_1.default.sign(Object.assign({ userId, role, type: "refresh" }, extra), jwtSecret_js_1.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
});
// Backwards-compatible alias
const generateToken = generateAccessToken;
const buildAuthExtras = (user, charityId) => {
    const extra = {};
    if (charityId)
        extra.charityId = charityId;
    if (user.role === "CHARITY_STAFF") {
        extra.permissions = (0, charityPermissions_js_1.resolveCharityStaffPermissions)(user.staffRole, user.permissions);
    }
    else if ((0, adminRoles_js_1.isAdminRole)(user.role)) {
        extra.permissions = (0, adminPermissions_js_1.resolveAdminPermissions)(user.role, user.permissions);
    }
    return extra;
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
        const _a = req.body, { role, firstName, lastName, email, country } = _a, userData = __rest(_a, ["role", "firstName", "lastName", "email", "country"]);
        const name = `${firstName || ""} ${lastName || ""}`.trim();
        const PUBLIC_ROLES = ["USER", "CHARITY"];
        if (!PUBLIC_ROLES.includes(role)) {
            return res.status(403).json({
                message: "Admin accounts cannot be created via public registration. Use the admin team panel or a bootstrap seed.",
            });
        }
        const { isUkCountry } = yield Promise.resolve().then(() => __importStar(require("../../utils/ukValidation.js")));
        const { DEFAULT_COUNTRY } = yield Promise.resolve().then(() => __importStar(require("../../constants/platformPolicy.js")));
        const accountCountry = country || DEFAULT_COUNTRY;
        if (!isUkCountry(accountCountry)) {
            return res.status(400).json({
                message: "Angelpage starts in the United States and also welcomes people in Canada and the United Kingdom.",
            });
        }
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
                newUser = new User_model_1.default(Object.assign(Object.assign({}, userData), { firstName, lastName, name, email, role, country: accountCountry }));
                break;
            case "CHARITY":
                if (!userData.charityNumber) {
                    return res.status(400).json({
                        message: "Charity registration number is required.",
                    });
                }
                newUser = new Charity_model_1.default(Object.assign(Object.assign({}, userData), { firstName, lastName, name, email, role, registrationStatus: "REGISTERED", country: accountCountry }));
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
        if (role === "USER") {
            try {
                yield (0, guestOrderLink_service_js_1.linkGuestOrdersToAccount)(newUser._id, email, role);
            }
            catch (linkErr) {
                console.error("Guest order link on register failed:", linkErr);
            }
        }
        try {
            yield (0, email_1.sendVerificationEmail)({
                email: newUser.email,
                firstName,
                verificationCode,
            });
            yield (0, email_1.sendWelcomeEmail)({
                email: newUser.email,
                firstName: newUser.firstName,
                userId: newUser._id.toString(),
                role: newUser.role,
            });
            (0, marketingJourneys_service_js_1.fireMarketingEvent)(marketingJourneys_service_js_1.JOURNEY_EVENTS.USER_REGISTERED, {
                email: newUser.email,
                firstName: newUser.firstName,
                role: newUser.role,
                userId: newUser._id.toString(),
            });
        }
        catch (emailError) {
            console.error("Registration emails failed (account still created):", emailError);
        }
        const token = jsonwebtoken_1.default.sign({ userId: newUser._id, role: newUser.role }, jwtSecret_js_1.JWT_SECRET, { expiresIn: "15m" });
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
    var _a, _b;
    try {
        const { email, password, role } = req.body;
        // Retrieve the user based on role
        let user;
        let charityId;
        switch (role) {
            case "USER":
                user = yield User_model_1.default.findOne({ email });
                break;
            case "CHARITY":
                user = yield Charity_model_1.default.findOne({ email });
                if (!user) {
                    const staff = yield CharityStaff_model_1.default.findOne({
                        email,
                        active: { $ne: false },
                    });
                    if (staff) {
                        user = staff;
                        charityId = (_a = staff.parentCharityId) === null || _a === void 0 ? void 0 : _a.toString();
                    }
                }
                break;
            case "CHARITY_STAFF":
                user = yield CharityStaff_model_1.default.findOne({
                    email,
                    active: { $ne: false },
                });
                if (user) {
                    charityId = (_b = user.parentCharityId) === null || _b === void 0 ? void 0 : _b.toString();
                }
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
        if (user.role !== role) {
            if (!(role === "ADMIN" && (0, adminRoles_js_1.isAdminRole)(user.role))) {
                if (!(role === "CHARITY" && user.role === "CHARITY_STAFF") &&
                    !(role === "CHARITY_STAFF" && user.role === "CHARITY_STAFF")) {
                    return res.status(403).json({
                        message: `This account is registered as ${user.role}. Please sign in with the correct account type.`,
                    });
                }
            }
        }
        // Compare the password using bcrypt
        const isMatch = yield comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Record login activity
        yield LoginActivity_model_1.default.create({
            userId: user._id,
            role: user.role,
        });
        if (user.role === "USER") {
            try {
                yield (0, guestOrderLink_service_js_1.linkGuestOrdersToAccount)(user._id, user.email, user.role);
            }
            catch (linkErr) {
                console.error("Guest order link on login failed:", linkErr);
            }
        }
        // Generate tokens
        const tokenExtra = buildAuthExtras(user, charityId);
        const token = generateAccessToken(user._id.toString(), user.role, tokenExtra);
        const refreshToken = generateRefreshToken(user._id.toString(), user.role, tokenExtra);
        // Send welcome back email
        const now = new Date();
        if (!user.lastWelcomeBackEmailSent ||
            now.getTime() - user.lastWelcomeBackEmailSent.getTime() >
                24 * 60 * 60 * 1000) {
            // await sendWelcomeBackEmail({
            // 	email: user.email,
            // 	firstName: user.firstName,
            // });
            // // Update the timestamp for the last email sent
            // user.lastWelcomeBackEmailSent = now;
            yield user.save();
        }
        res.status(200).json({
            message: "Login successful",
            user: Object.assign(Object.assign({}, user.toObject()), { charityId, staffRole: user.staffRole, permissions: tokenExtra.permissions || [] }),
            token,
            refreshToken,
        });
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});
exports.loginUser = loginUser;
// Send Password Reset Email
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
            return res.status(404).json({
                message: "No account found for this email and role. Select the correct account type (User, Charity, or Admin).",
            });
        }
        if (role === "ADMIN" && user.role !== role) {
            // Sub-admin roles (OPS_ADMIN, etc.) — allow reset via Admin selector
            const { isAdminRole } = yield Promise.resolve().then(() => __importStar(require("../../constants/adminRoles.js")));
            if (!isAdminRole(user.role)) {
                return res.status(404).json({ message: "User not found" });
            }
        }
        else if (user.role !== role) {
            return res.status(404).json({
                message: `No ${role} account found for this email. Try a different account type.`,
            });
        }
        // Create a reset token with a short expiration (e.g., 15 minutes)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, jwtSecret_js_1.JWT_SECRET, { expiresIn: "10m" });
        yield (0, email_1.sendPasswordResetEmail)({
            email: user.email,
            resetToken,
            firstName: user.firstName,
        });
        res.json({ message: "Password reset email sent" });
    }
    catch (error) {
        console.error("Error sending password reset email:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.body) || error.message || error);
        const hint = ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("Failed to send"))
            ? " Email could not be sent — check SENDGRID_FROM is verified on angelpage.co.uk."
            : "";
        res.status(500).json({ message: `Failed to send password reset email.${hint}` });
    }
});
exports.requestPasswordReset = requestPasswordReset;
// Reset Password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret_js_1.JWT_SECRET);
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
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, role } = req.body;
    console.log('Received userId:', userId, 'Received role:', role);
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
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret_js_1.JWT_SECRET);
        if (decoded.type === "refresh") {
            return res.status(401).json({ message: "Access token required." });
        }
        if (Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ message: "Token has expired." });
        }
        return res.status(200).json({
            valid: true,
            userId: decoded.userId,
            role: decoded.role,
            charityId: decoded.charityId,
        });
    }
    catch (error) {
        console.error("Token validation error:", error.message);
        return res.status(401).json({ message: "Invalid or expired token." });
    }
};
exports.checkToken = checkToken;
const refreshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token is required." });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, jwtSecret_js_1.JWT_SECRET);
        if (decoded.type !== "refresh") {
            return res.status(401).json({ message: "Invalid refresh token." });
        }
        const tokenExtra = Object.assign(Object.assign({}, (decoded.charityId ? { charityId: decoded.charityId } : {})), (decoded.permissions ? { permissions: decoded.permissions } : {}));
        const token = generateAccessToken(decoded.userId, decoded.role, tokenExtra);
        // Keep the same refresh token until it expires to avoid session races
        // that can invalidate the client copy and force an automatic logout.
        return res.status(200).json({
            token,
            refreshToken,
            userId: decoded.userId,
            role: decoded.role,
        });
    }
    catch (error) {
        console.error("Refresh token error:", error.message);
        return res.status(401).json({ message: "Invalid or expired refresh token." });
    }
});
exports.refreshAccessToken = refreshAccessToken;
const oauthLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { email, name, image, provider, providerId, intendedRole = "USER" } = req.body;
        if (!email || !provider) {
            return res.status(400).json({ message: "Email and provider are required." });
        }
        let user;
        let charityId;
        if (intendedRole === "CHARITY") {
            user = yield Charity_model_1.default.findOne({ email });
            if (!user) {
                const staff = yield CharityStaff_model_1.default.findOne({
                    email,
                    active: { $ne: false },
                });
                if (staff) {
                    user = staff;
                    charityId = (_a = staff.parentCharityId) === null || _a === void 0 ? void 0 : _a.toString();
                }
            }
            if (!user) {
                return res.status(404).json({
                    message: "No charity or staff account found for this email. Register your charity first.",
                });
            }
        }
        else if (intendedRole === "ADMIN") {
            user = yield Admin_model_1.default.findOne({ email });
            if (!user || !(0, adminRoles_js_1.isAdminRole)(user.role)) {
                return res.status(404).json({
                    message: "No admin account found for this email.",
                });
            }
        }
        else {
            user = yield User_model_1.default.findOne({ email });
            if (!user) {
                const nameParts = (name || "Angelpage User").trim().split(" ");
                const firstName = nameParts[0] || "User";
                const lastName = nameParts.slice(1).join(" ") || "Member";
                const randomPassword = `${provider}-${providerId || "oauth"}-${Date.now()}`;
                user = new User_model_1.default({
                    email,
                    firstName,
                    lastName,
                    userName: `${email.split("@")[0]}_${Date.now()}`,
                    password: randomPassword,
                    role: "USER",
                    verified: true,
                    profileImage: image || "",
                    profileCompleted: false,
                });
                yield user.save();
            }
        }
        if (user.role === "USER") {
            try {
                yield (0, guestOrderLink_service_js_1.linkGuestOrdersToAccount)(user._id, email, user.role);
            }
            catch (linkErr) {
                console.error("Guest order link on OAuth failed:", linkErr);
            }
        }
        const tokenExtra = buildAuthExtras(user, charityId);
        const token = generateAccessToken(user._id.toString(), user.role, tokenExtra);
        const refreshToken = generateRefreshToken(user._id.toString(), user.role, tokenExtra);
        return res.status(200).json({
            message: "OAuth login successful",
            user: Object.assign(Object.assign({}, user.toObject()), { charityId, staffRole: user.staffRole, permissions: tokenExtra.permissions || [] }),
            token,
            refreshToken,
        });
    }
    catch (error) {
        console.error("OAuth login error:", error);
        return res.status(500).json({ message: "OAuth login failed." });
    }
});
exports.oauthLogin = oauthLogin;
const claimGuestOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId) {
            return res.status(400).json({ message: "User context required." });
        }
        const user = yield User_model_1.default.findById(userId).select("email role");
        if (!(user === null || user === void 0 ? void 0 : user.email)) {
            return res.status(404).json({ message: "User not found." });
        }
        const result = yield (0, guestOrderLink_service_js_1.linkGuestOrdersToAccount)(userId, user.email, user.role || role);
        return res.status(200).json(Object.assign({ message: result.linked > 0
                ? `Linked ${result.linked} guest order(s) to your account.`
                : "No guest orders found for this email." }, result));
    }
    catch (error) {
        console.error("claimGuestOrders:", error);
        return res.status(500).json({ message: "Failed to link guest orders." });
    }
});
exports.claimGuestOrders = claimGuestOrders;
