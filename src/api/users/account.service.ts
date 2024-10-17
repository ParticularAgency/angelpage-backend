// // account.service.ts
// import User from "../../models/User.model"; // Assuming you have a User model

// export class AccountService {
// 	// Get Account Details
// 	async getAccountDetails(userId) {
// 		const accountDetails = await User.findById(userId);
// 		return accountDetails;
// 	}

// 	// Update Account Password
// 	async updateAccountPassword(userId, oldPassword, newPassword) {
// 		const user = await User.findById(userId);
// 		if (!user || !user.comparePassword(oldPassword)) {
// 			throw new Error("Old password is incorrect");
// 		}
// 		user.password = newPassword; // Assuming you have a method to hash the password
// 		await user.save();
// 	}

// 	// Update Account Email
// 	async updateAccountEmail(userId, newEmail) {
// 		await User.findByIdAndUpdate(userId, { email: newEmail });
// 	}

// 	// Deactivate Account
// 	async deactivateAccount(userId) {
// 		await User.findByIdAndUpdate(userId, { active: false }); // Mark account as inactive
// 	}
// }

	// // Delete User Account
	// async deleteUserAccount(userId) {
	// 	await User.findByIdAndDelete(userId);
	// }