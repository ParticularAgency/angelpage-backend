// import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../../models/User.model";
import Charity from "../../models/Charity.model";
import Admin from "../../models/Admin.model";
import {
	sendPasswordResetEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
	sendWelcomeBackEmail,
	sendPasswordResetCompletionEmail,
	sendEmail,
} from "../../utils/email";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Utility to generate a token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "30m" });
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
		const { role, firstName, lastName, email, ...userData } = req.body;
		const name = `${firstName || ""} ${lastName || ""}`.trim();
        
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
				newUser = new User({ ...userData, firstName, lastName, name, email, role });
				break;
			case "CHARITY":
				newUser = new Charity({ ...userData, firstName, lastName, name, email, role });
				break;
			case "ADMIN":
				newUser = new Admin({ ...userData, firstName, lastName, email, role });
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

		// Send email verification link
		await sendVerificationEmail({
			email: newUser.email,
			firstName,
			verificationCode,
		});

		// Send welcome email
		await sendWelcomeEmail({
			email: newUser.email,
			firstName: newUser.firstName,
			userId: newUser._id.toString(),
			role: newUser.role, 
		});
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
			return res.status(400).json({ message: "Invalid email or password" });
		}

		// Compare the password using bcrypt
		const isMatch = await comparePassword(password, user.password);
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
		if (
			!user.lastWelcomeBackEmailSent ||
			now.getTime() - user.lastWelcomeBackEmailSent.getTime() >
				24 * 60 * 60 * 1000
		) {
			await sendWelcomeBackEmail({
				email: user.email,
				firstName: user.firstName,
			});
			// Update the timestamp for the last email sent
			user.lastWelcomeBackEmailSent = now;
			await user.save();
		}
		res.status(200).json({ message: "Login successful", user, token });
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
			return res.status(404).json({ message: "User not found" });
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
		console.error("Error sending password reset email:", error);
		res.status(500).json({ message: "Failed to send password reset email" });
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

// Delete Account
export const deleteAccount = async (req, res) => {
	const { userId, role } = req.body;

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
		// Verify the token
		const decoded = jwt.verify(token, JWT_SECRET);

		// Check if token has expired (optional, since jwt.verify does this)
		if (Date.now() >= decoded.exp * 1000) {
			return res.status(401).json({ message: "Token has expired." });
		}

		// Token is valid, send success response
		return res.status(200).json({ message: "Token is valid." });
	} catch (error) {
		console.error("Token validation error:", error.message);
		return res.status(401).json({ message: "Invalid or expired token." });
	}
};