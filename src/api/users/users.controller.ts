import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import User from "../../models/User.model";
import bcrypt from "bcryptjs";

interface CustomRequest extends Request {
	user?: {
		userId: string;
	};
}

// Utility to handle unknown error types
const handleUnknownError = (error: unknown): string =>
	error instanceof Error ? error.message : "An unknown error occurred";

// Update User Profile
export const updateProfile = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const {
			firstName,
			lastName,
			dateBirth,
			email,
			userName,
			description,
			currentPassword,
			newPassword,
		} = req.body;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const updateData: Partial<typeof user> = {};

		// Update password if provided
		if (currentPassword && newPassword) {
			const isPasswordCorrect = await bcrypt.compare(
				currentPassword,
				user.password,
			);
			if (!isPasswordCorrect) {
				res.status(400).json({ message: "Current password is incorrect" });
				return;
			}
			updateData.password = await bcrypt.hash(newPassword, 10);
		}

		// Update other fields if provided
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (dateBirth) updateData.dateBirth = dateBirth;
		if (email) updateData.email = email;
		if (userName) updateData.userName = userName;
		if (description) updateData.description = description;

		// Upload profile image to Cloudinary if provided
		if (req.file?.path) {
			const result = await cloudinary.uploader.upload(req.file.path, {
				folder: "user_profiles",
				public_id: `user_${userId}`,
				overwrite: true,
			});
			updateData.profileImage = result.secure_url;
		}

		const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
			new: true,
		});

		res
			.status(200)
			.json({ message: "Profile updated successfully", user: updatedUser });
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({
			message: "Failed to update profile",
			error: handleUnknownError(error),
		});
	}
};

// Get User Profile
export const getUserProfile = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const user = await User.findById(userId).select("-password");
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res.status(500).json({
			message: "Failed to fetch user profile",
			error: handleUnknownError(error),
		});
	}
};

// Add Address
export const addAddress = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const newAddress = req.body;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.addresses.push(newAddress);
		await user.save();

		res.status(201).json({
			message: "Address added successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error adding address:", error);
		res.status(500).json({
			message: "Failed to add address",
			error: handleUnknownError(error),
		});
	}
};

// Update Address
export const updateAddress = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { addressId } = req.params;
		const updatedAddress = req.body;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const address = user.addresses.find(
			addr => addr._id.toString() === addressId,
		);
		if (!address) {
			res.status(404).json({ message: "Address not found" });
			return;
		}
 
		Object.assign(address, updatedAddress);
		await user.save();

		res.status(200).json({
			message: "Address updated successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error updating address:", error);
		res.status(500).json({
			message: "Failed to update address",
			error: handleUnknownError(error),
		});
	}
};

// Delete Address
export const deleteAddress = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { addressId } = req.params;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.addresses = user.addresses.filter(
			address => address._id.toString() !== addressId,
		);
		await user.save();

		res.status(200).json({
			message: "Address deleted successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error deleting address:", error);
		res.status(500).json({
			message: "Failed to delete address",
			error: handleUnknownError(error),
		});
	}
};

// Add Payment Method
export const addPayment = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const newPayment = req.body;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.payments.push(newPayment);
		await user.save();

		res.status(201).json({
			message: "Payment method added successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error adding payment:", error);
		res.status(500).json({
			message: "Failed to add payment method",
			error: handleUnknownError(error),
		});
	}
};

// Update Payment Method
export const updatePayment = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { paymentId } = req.params;
		const updatedPayment = req.body;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const payment = user.payments.find(pay => pay._id.toString() === paymentId);
		if (!payment) {
			res.status(404).json({ message: "Payment method not found" });
			return;
		}

		Object.assign(payment, updatedPayment);
		await user.save();

		res.status(200).json({
			message: "Payment method updated successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error updating payment:", error);
		res.status(500).json({
			message: "Failed to update payment method",
			error: handleUnknownError(error),
		});
	}
};

// Delete Payment Method
export const deletePayment = async (
	req: CustomRequest,
	res: Response,
): Promise<void> => {
	try {
		const userId = req.user?.userId;
		const { paymentId } = req.params;

		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.payments = user.payments.filter(
			payment => payment._id.toString() !== paymentId,
		);
		await user.save();

		res.status(200).json({
			message: "Payment method deleted successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error deleting payment method:", error);
		res.status(500).json({
			message: "Failed to delete payment method",
			error: handleUnknownError(error),
		});
	}
};
