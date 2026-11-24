// import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import CharityStaff from "../../models/CharityStaff.model";
import { resolveAdminPermissions } from "../../constants/adminPermissions.js";
import { resolveCharityStaffPermissions } from "../../constants/charityPermissions.js";
import Admin from "../../models/Admin.model";
import LoginActivity from '../../models/LoginActivity.model';
import {
	sendPasswordResetEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
	sendWelcomeBackEmail,
	sendPasswordResetCompletionEmail,
	sendEmail,
} from "../../utils/email";
import { isAdminRole } from "../../constants/adminRoles.js";
import {
	fireMarketingEvent,
	JOURNEY_EVENTS,
} from "../../services/marketingJourneys.service.js";
import { linkGuestOrdersToAccount } from "../../services/guestOrderLink.service.js";
import { JWT_SECRET } from "../../config/jwtSecret.js";

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "30m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

const generateAccessToken = (userId, role, extra = {}) =>
	jwt.sign({ userId, role, type: "access", ...extra }, JWT_SECRET, {
		expiresIn: ACCESS_TOKEN_EXPIRY,
	});

const generateRefreshToken = (userId, role, extra = {}) =>
	jwt.sign({ userId, role, type: "refresh", ...extra }, JWT_SECRET, {
		expiresIn: REFRESH_TOKEN_EXPIRY,
	});

// Backwards-compatible alias
const generateToken = generateAccessToken;

const buildAuthExtras = (user, charityId) => {
	const extra = {};
	if (charityId) extra.charityId = charityId;
	if (user.role === "CHARITY_STAFF") {
		extra.permissions = resolveCharityStaffPermissions(
			user.staffRole,
			user.permissions,
		);
	} else if (isAdminRole(user.role)) {
		extra.permissions = resolveAdminPermissions(user.role, user.permissions);
	}
	return extra;
};


// Utility to compare passwords
const comparePassword = async (
  password,
  hashedPassword
) => {
  return bcrypt.compare(password, hashedPassword);
};
 
const generateVerificationCode = () => {
	return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a random 6-digit number
};


// Register User
export const registerUser = async (req, res) => {
  try {
		const { role, firstName, lastName, email, country, ...userData } = req.body;
		const name = `${firstName || ""} ${lastName || ""}`.trim();

		const PUBLIC_ROLES = ["USER", "CHARITY"];
		if (!PUBLIC_ROLES.includes(role)) {
			return res.status(403).json({
				message:
					"Admin accounts cannot be created via public registration. Use the admin team panel or a bootstrap seed.",
			});
		}

		const { isUkCountry } = await import("../../utils/ukValidation.js");
		const { DEFAULT_COUNTRY } = await import("../../constants/platformPolicy.js");
		const accountCountry = country || DEFAULT_COUNTRY;
		if (!isUkCountry(accountCountry)) {
			return res.status(400).json({
				message:
					"Angelpage starts in the United States and also welcomes people in Canada and the United Kingdom.",
			});
		}
        
		const isEmailTaken =
			(await User.findOne({ email })) ||
			(await Charity.findOne({ email })) ||
			(await Admin.findOne({ email }));

		if (isEmailTaken) {
			return res.status(400).json({
				message: `This email is already in use for the ${isEmailTaken.role} role.`,
			});
		}
		let newUser;
		switch (role) {
			case "USER":
				newUser = new User({ ...userData, firstName, lastName, name, email, role, country: accountCountry });
				break;
		case "CHARITY":
				if (!userData.charityNumber) {
					return res.status(400).json({
						message: "Charity registration number is required.",
					});
				}
				newUser = new Charity({ ...userData, firstName, lastName, name, email, role, registrationStatus: "REGISTERED", country: accountCountry });
				break;
			default:
				return res.status(400).json({ message: "Invalid role specified" });
		}

		// Generate a 6-digit verification code
		const verificationCode = generateVerificationCode();
		const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // Expire in 15 minutes

		newUser.verificationCode = verificationCode;
		newUser.verificationExpiry = verificationExpiry;
        
		await newUser.save(); 

		if (role === "USER") {
			try {
				await linkGuestOrdersToAccount(newUser._id, email, role);
			} catch (linkErr) {
				console.error("Guest order link on register failed:", linkErr);
			}
		}

		try {
			await sendVerificationEmail({
				email: newUser.email,
				firstName,
				verificationCode,
			});
			await sendWelcomeEmail({
				email: newUser.email,
				firstName: newUser.firstName,
				userId: newUser._id.toString(),
				role: newUser.role,
			});
			fireMarketingEvent(JOURNEY_EVENTS.USER_REGISTERED, {
				email: newUser.email,
				firstName: newUser.firstName,
				role: newUser.role,
				userId: newUser._id.toString(),
			});
		} catch (emailError) {
			console.error("Registration emails failed (account still created):", emailError);
		}

		const token = jwt.sign(
			{ userId: newUser._id, role: newUser.role },
			JWT_SECRET,
			{ expiresIn: "15m" },
		);

		res.status(201).json({
			message: "Registration successful. Please verify your email.",
			user: newUser,
			token,
		});
	} catch (error) {
    console.error("Error during registration:", error);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

// Verify Email (Handle Expired Codes by Allowing Resend)
export const verifyEmail = async (req, res) => {
  try {
     const { email, verificationCode, role } = req.body;

    console.log(`Verification attempt for email: ${email} with code: ${verificationCode}`);

    // Find user by email, explicitly selecting verification fields
    const user =
      (await User.findOne({ email }).select('+verificationCode +verificationExpiry')) ||
      (await Charity.findOne({ email }).select('+verificationCode +verificationExpiry')) ||
      (await Admin.findOne({ email }).select('+verificationCode +verificationExpiry'));

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
    await user.save();

    // Send verification completion email
    await sendEmail({
      to: user.email,
      subject: "Email Verification Completed",
      text: `Hello ${user.firstName}, your email verification is complete.`,
    });

    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(400).json({ message: "Error verifying email." });
  }
};

// Resend Verification Code
export const resendVerificationEmail = async (req, res) => {
	try {
		const { email } = req.body;

		console.log(`Resending verification email for: ${email}`);

		// Find user by email
		const user =
			(await User.findOne({ email })) ||
			(await Charity.findOne({ email })) ||
			(await Admin.findOne({ email }));

		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		// Generate a new verification code
		const verificationCode = generateVerificationCode();
		user.verificationCode = verificationCode;
		user.verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiry
		await user.save();

		// Send the new verification code
		await sendVerificationEmail({
			email: user.email,
			firstName: user.firstName,
			verificationCode,
		});

		console.log(`Verification code resent to: ${email}`);
		res.status(200).json({ message: "Verification code resent successfully." });
	} catch (error) {
		console.error("Error resending verification email:", error);
		res.status(500).json({ message: "Failed to resend verification code." });
	}
};
// Login User
export const loginUser = async (req, res) => {
  try {
		const { email, password, role } = req.body;

		// Retrieve the user based on role
		let user;
		let charityId;
		switch (role) {
			case "USER":
				user = await User.findOne({ email });
				break;
			case "CHARITY":
				user = await Charity.findOne({ email });
				if (!user) {
					const staff = await CharityStaff.findOne({
						email,
						active: { $ne: false },
					});
					if (staff) {
						user = staff;
						charityId = staff.parentCharityId?.toString();
					}
				}
				break;
			case "CHARITY_STAFF":
				user = await CharityStaff.findOne({
					email,
					active: { $ne: false },
				});
				if (user) {
					charityId = user.parentCharityId?.toString();
				}
				break;
			case "ADMIN":
				user = await Admin.findOne({ email });
				break;
			default:
				return res.status(400).json({ message: "Invalid role specified" });
		}

		if (!user) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		if (user.role !== role) {
			if (!(role === "ADMIN" && isAdminRole(user.role))) {
				if (
					!(role === "CHARITY" && user.role === "CHARITY_STAFF") &&
					!(role === "CHARITY_STAFF" && user.role === "CHARITY_STAFF")
				) {
					return res.status(403).json({
						message: `This account is registered as ${user.role}. Please sign in with the correct account type.`,
					});
				}
			}
		}

		// Compare the password using bcrypt
		const isMatch = await comparePassword(password, user.password);

		if (!isMatch) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

	    // Record login activity
		await LoginActivity.create({
			userId: user._id,
			role: user.role,
		});

		if (user.role === "USER") {
			try {
				await linkGuestOrdersToAccount(user._id, user.email, user.role);
			} catch (linkErr) {
				console.error("Guest order link on login failed:", linkErr);
			}
		}

		// Generate tokens
		const tokenExtra = buildAuthExtras(user, charityId);
		const token = generateAccessToken(
			user._id.toString(),
			user.role,
			tokenExtra,
		);
		const refreshToken = generateRefreshToken(
			user._id.toString(),
			user.role,
			tokenExtra,
		);
		// Send welcome back email
		const now = new Date();
		if (
			!user.lastWelcomeBackEmailSent ||
			now.getTime() - user.lastWelcomeBackEmailSent.getTime() >
				24 * 60 * 60 * 1000
		) {
			// await sendWelcomeBackEmail({
			// 	email: user.email,
			// 	firstName: user.firstName,
			// });
			// // Update the timestamp for the last email sent
			// user.lastWelcomeBackEmailSent = now;
			await user.save();
		}
		res.status(200).json({
			message: "Login successful",
			user: {
				...user.toObject(),
				charityId,
				staffRole: user.staffRole,
				permissions: tokenExtra.permissions || [],
			},
			token,
			refreshToken,
		});
	} catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};


// Send Password Reset Email
export const requestPasswordReset = async (req, res) => {
	const { email, role } = req.body;

	try {
		let user;
		switch (role) {
			case "USER":
				user = await User.findOne({ email });
				break;
			case "CHARITY":
				user = await Charity.findOne({ email });
				break;
			case "ADMIN":
				user = await Admin.findOne({ email });
				break;
			default:
				return res.status(400).json({ message: "Invalid role specified" });
		}

		if (!user) {
			return res.status(404).json({
				message:
					"No account found for this email and role. Select the correct account type (User, Charity, or Admin).",
			});
		}

		if (role === "ADMIN" && user.role !== role) {
			// Sub-admin roles (OPS_ADMIN, etc.) — allow reset via Admin selector
			const { isAdminRole } = await import("../../constants/adminRoles.js");
			if (!isAdminRole(user.role)) {
				return res.status(404).json({ message: "User not found" });
			}
		} else if (user.role !== role) {
			return res.status(404).json({
				message: `No ${role} account found for this email. Try a different account type.`,
			});
		}

		// Create a reset token with a short expiration (e.g., 15 minutes)
		const resetToken = jwt.sign(
			{ userId: user._id, role: user.role },
			JWT_SECRET,
			{ expiresIn: "10m" },
		);

		await sendPasswordResetEmail({
			email: user.email,
			resetToken,
			firstName: user.firstName,
		});

		res.json({ message: "Password reset email sent" });
	} catch (error) {
		console.error("Error sending password reset email:", error.response?.body || error.message || error);
		const hint =
			error.message?.includes("Failed to send")
				? " Email could not be sent — check SENDGRID_FROM is verified on angelpage.co.uk."
				: "";
		res.status(500).json({ message: `Failed to send password reset email.${hint}` });
	}
};


// Reset Password
export const resetPassword = async (req, res) => {
	try {
		const { token, newPassword } = req.body;

		const decoded = jwt.verify(token, JWT_SECRET);
		const { userId, role } = decoded;

		let user;
		switch (role) {
			case "USER":
				user = await User.findById(userId);
				break;
			case "CHARITY":
				user = await Charity.findById(userId);
				break;
			case "ADMIN":
				user = await Admin.findById(userId);
				break;
			default:
				return res.status(400).json({ message: "Invalid role specified." });
		}

		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		// Directly update the password, Mongoose middleware will handle hashing
		user.password = newPassword;
		await user.save();
		// Send password reset completion email
		await sendPasswordResetCompletionEmail({
			email: user.email,
			firstName: user.firstName,
		});
		console.log("Password updated successfully for user:", userId);
		res.status(200).json({ message: "Password reset successful." });
	} catch (error) {
		console.error("Error resetting password:", error);
		res.status(400).json({ message: "Invalid or expired reset token." });
	}
};

export const deleteAccount = async (req, res) => {
	const { userId, role } = req.body;

	console.log('Received userId:', userId, 'Received role:', role);

	if (!userId) {
		return res.status(400).json({ message: "User ID is required" });
	}

	try {
		let userModel;
		switch (role) {
			case "USER":
				userModel = User;
				break;
			case "CHARITY":
				userModel = Charity;
				break;
			case "ADMIN":
				userModel = Admin;
				break;
			default:
				return res.status(400).json({ message: "Invalid role specified" });
		}

		const user = await userModel.findByIdAndDelete(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ message: "Account deleted successfully" });
	} catch (error) {
		console.error("Error deleting account:", error);
		res
			.status(500)
			.json({ message: "Failed to delete account", error: error.message });
	}
};

// Fetch User Profile Data
export const fetchUserProfile = async (req, res) => {
	try {
		const { email } = req.params;

		// Find user by email
		const user =
			(await User.findOne({ email })) ||
			(await Charity.findOne({ email })) ||
			(await Admin.findOne({ email }));

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
				if (user[field] && user[field].length > 0) fieldsCompleted++;
			} else {
				if (user[field]) fieldsCompleted++;
			}
		});

		const totalFields = fields.length;
		const profileCompletionPercentage = (fieldsCompleted / totalFields) * 100;
		const profileCompleted = profileCompletionPercentage === 100;

		// Update the profileCompleted property if necessary
		if (user.profileCompleted !== profileCompleted) {
			user.profileCompleted = profileCompleted;
			await user.save();
		}

		// Return user profile data without sensitive information like password or verification codes
		const { password, verificationCode, verificationExpiry, ...profileData } =
			user.toObject();

		res.status(200).json({
			user: profileData,
			profileCompletionPercentage,
		});
	} catch (error) {
		console.error("Error fetching user data:", error);
		res.status(500).json({ message: "Error fetching user data." });
	}
};
export const fetchCharityProfile = async (req, res) => {
	try {
		const { email } = req.params;

		// Find user by email
		const user =
			(await User.findOne({ email })) ||
			(await Charity.findOne({ email })) ||
			(await Admin.findOne({ email }));

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
				if (user[field] && user[field].length > 0) fieldsCompleted++;
			} else {
				if (user[field]) fieldsCompleted++;
			}
		});

		const totalFields = fields.length;
		const profileCompletionPercentage = (fieldsCompleted / totalFields) * 100;
		const profileCompleted = profileCompletionPercentage === 100;

		// Update the profileCompleted property if necessary
		if (user.profileCompleted !== profileCompleted) {
			user.profileCompleted = profileCompleted;
			await user.save();
		}

		// Return user profile data without sensitive information like password or verification codes
		const { password, verificationCode, verificationExpiry, ...profileData } =
			user.toObject();

		res.status(200).json({
			user: profileData,
			profileCompletionPercentage,
		});
	} catch (error) {
		console.error("Error fetching user data:", error);
		res.status(500).json({ message: "Error fetching user data." });
	}
};

// Endpoint to check if the token is valid
export const checkToken = (req, res) => {
	const authHeader = req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Access denied. No token provided." });
	}

	const token = authHeader.replace("Bearer ", "");

	try {
		const decoded = jwt.verify(token, JWT_SECRET);

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
	} catch (error) {
		console.error("Token validation error:", error.message);
		return res.status(401).json({ message: "Invalid or expired token." });
	}
};

export const refreshAccessToken = async (req, res) => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(400).json({ message: "Refresh token is required." });
		}

		const decoded = jwt.verify(refreshToken, JWT_SECRET);

		if (decoded.type !== "refresh") {
			return res.status(401).json({ message: "Invalid refresh token." });
		}

		const tokenExtra = {
			...(decoded.charityId ? { charityId: decoded.charityId } : {}),
			...(decoded.permissions ? { permissions: decoded.permissions } : {}),
		};
		const token = generateAccessToken(
			decoded.userId,
			decoded.role,
			tokenExtra,
		);

		// Keep the same refresh token until it expires to avoid session races
		// that can invalidate the client copy and force an automatic logout.
		return res.status(200).json({
			token,
			refreshToken,
			userId: decoded.userId,
			role: decoded.role,
		});
	} catch (error) {
		console.error("Refresh token error:", error.message);
		return res.status(401).json({ message: "Invalid or expired refresh token." });
	}
};

export const oauthLogin = async (req, res) => {
	try {
		const { email, name, image, provider, providerId, intendedRole = "USER" } =
			req.body;

		if (!email || !provider) {
			return res.status(400).json({ message: "Email and provider are required." });
		}

		let user;
		let charityId;

		if (intendedRole === "CHARITY") {
			user = await Charity.findOne({ email });
			if (!user) {
				const staff = await CharityStaff.findOne({
					email,
					active: { $ne: false },
				});
				if (staff) {
					user = staff;
					charityId = staff.parentCharityId?.toString();
				}
			}
			if (!user) {
				return res.status(404).json({
					message:
						"No charity or staff account found for this email. Register your charity first.",
				});
			}
		} else if (intendedRole === "ADMIN") {
			user = await Admin.findOne({ email });
			if (!user || !isAdminRole(user.role)) {
				return res.status(404).json({
					message: "No admin account found for this email.",
				});
			}
		} else {
			user = await User.findOne({ email });

			if (!user) {
				const nameParts = (name || "Angelpage User").trim().split(" ");
				const firstName = nameParts[0] || "User";
				const lastName = nameParts.slice(1).join(" ") || "Member";
				const randomPassword = `${provider}-${providerId || "oauth"}-${Date.now()}`;

				user = new User({
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
				await user.save();
			}
		}

		if (user.role === "USER") {
			try {
				await linkGuestOrdersToAccount(user._id, email, user.role);
			} catch (linkErr) {
				console.error("Guest order link on OAuth failed:", linkErr);
			}
		}

		const tokenExtra = buildAuthExtras(user, charityId);
		const token = generateAccessToken(
			user._id.toString(),
			user.role,
			tokenExtra,
		);
		const refreshToken = generateRefreshToken(
			user._id.toString(),
			user.role,
			tokenExtra,
		);

		return res.status(200).json({
			message: "OAuth login successful",
			user: {
				...user.toObject(),
				charityId,
				staffRole: user.staffRole,
				permissions: tokenExtra.permissions || [],
			},
			token,
			refreshToken,
		});
	} catch (error) {
		console.error("OAuth login error:", error);
		return res.status(500).json({ message: "OAuth login failed." });
	}
};

export const claimGuestOrders = async (req, res) => {
	try {
		const userId = req.user?.userId;
		const role = req.user?.role;

		if (!userId) {
			return res.status(400).json({ message: "User context required." });
		}

		const user = await User.findById(userId).select("email role");
		if (!user?.email) {
			return res.status(404).json({ message: "User not found." });
		}

		const result = await linkGuestOrdersToAccount(
			userId,
			user.email,
			user.role || role,
		);

		return res.status(200).json({
			message:
				result.linked > 0
					? `Linked ${result.linked} guest order(s) to your account.`
					: "No guest orders found for this email.",
			...result,
		});
	} catch (error) {
		console.error("claimGuestOrders:", error);
		return res.status(500).json({ message: "Failed to link guest orders." });
	}
};