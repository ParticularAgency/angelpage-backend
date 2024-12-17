"use strict";
// import jwt from "jsonwebtoken";
// import User, { IUser } from "../models/User.model";
// import { hashPassword, comparePassword } from "../api/auth/auth.utils";
// import { config } from "../config/env";
// // Utility function to generate a JWT token with user ID and role
// export const generateToken = (userId: string, role: string): string => {
// 	return jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: "1h" });
// };
// // Register a new user and return the user object along with the JWT token
// export const registerUser = async (
// 	firstName: string,
// 	lastName: string,
// 	email: string,
// 	userName: string,
// 	password: string,
// 	role: string,
// ): Promise<{ user: IUser; token: string }> => {
// 	try {
// 		// Check if user already exists by email
// 		const existingUser = await User.findOne({ email });
// 		if (existingUser) throw new Error("User already exists");
// 		// Hash password before saving
// 		const hashedPassword = await hashPassword(password);
// 		// Create and save the new user with hashed password
// 		const user = new User({
// 			firstName,
// 			lastName,
// 			name: `${firstName} ${lastName}`,
// 			email,
// 			userName,
// 			password: hashedPassword,
// 			role,
// 			profileCompleted: false,
// 			verified: false,
// 			addresses: [],
// 			paymentMethods: [],
// 		});
// 		await user.save();
// 		// Generate JWT token
// 		const token = generateToken(user._id.toString(), user.role);
// 		return { user, token };
// 	} catch (error) {
// 		console.error("Error in registerUser:", error);
// 		throw new Error("Registration failed");
// 	}
// };
// // Login a user by verifying credentials and returning the user and token
// export const loginUser = async (
// 	email: string,
// 	password: string,
// 	role: string,
// ): Promise<{ user: IUser; token: string }> => {
// 	try {
// 		// Find user by email
// 		const user = await User.findOne({ email, role );
// 		if (!user) throw new Error("User not found");
// 		// Verify the password
// 		const isPasswordValid = await comparePassword(password, user.password);
// 		if (!isPasswordValid) {
// 			throw new Error("Invalid email or password");
// 		}
// 		// Ensure the user's email is verified before allowing login
// 		if (!user.verified) {
// 			throw new Error("Please verify your email before logging in");
// 		}
// 		// Generate JWT token
// 		const token = generateToken(user._id.toString(), user.role);
// 		return { user, token };
// 	} catch (error) {
// 		console.error("Error in loginUser:", error);
// 		throw new Error("Login failed");
// 	}
// };
// // Additional utility for completing user profile
// export const completeUserProfile = async (
// 	userId: string,
// 	addresses: any[],
// 	paymentMethods: any[],
// ): Promise<IUser> => {
// 	try {
// 		const user = await User.findById(userId);
// 		if (!user) throw new Error("User not found");
// 		// Update user's profile information
// 		user.addresses = addresses;
// 		user.paymentMethods = paymentMethods;
// 		user.profileCompleted = true;
// 		await user.save();
// 		return user;
// 	} catch (error) {
// 		console.error("Error in completeUserProfile:", error);
// 		throw new Error("Profile completion failed");
// 	}
// };
