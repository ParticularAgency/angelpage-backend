// // account.controller.ts
// import { Request, Response } from "express";
// import { AccountService } from "./account.service";

// const accountService = new AccountService();

// // Get Account Details
// export const getAccountDetails = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const accountDetails = await accountService.getAccountDetails(userId);
// 		res.status(200).json(accountDetails);
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Update Account Password
// export const updateAccountPassword = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const { oldPassword, newPassword } = req.body; // Get passwords from the request
// 		const result = await accountService.updateAccountPassword(
// 			userId,
// 			oldPassword,
// 			newPassword,
// 		);
// 		res.status(200).json({ message: "Password updated successfully." });
// 	} catch (error) {
// 		res.status(400).json({ message: error.message }); // Bad request
// 	}
// };

// // Update Account Email
// export const updateAccountEmail = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		const { newEmail } = req.body; // Get new email from the request
// 		await accountService.updateAccountEmail(userId, newEmail);
// 		res.status(200).json({ message: "Email updated successfully." });
// 	} catch (error) {
// 		res.status(400).json({ message: error.message }); // Bad request
// 	}
// };

// // Deactivate Account
// export const deactivateAccount = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		await accountService.deactivateAccount(userId);
// 		res.status(204).send(); // No content
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };

// // Delete User Account
// export const deleteUserAccount = async (req: Request, res: Response) => {
// 	try {
// 		const userId = req.user.id; // Get user ID from middleware
// 		await userService.deleteUserAccount(userId);
// 		res.status(204).send(); // No content
// 	} catch (error) {
// 		res.status(500).json({ message: error.message });
// 	}
// };