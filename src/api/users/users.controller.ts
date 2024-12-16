import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import User from "../../models/User.model";
import bcrypt from "bcryptjs";

export const updateProfile = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user; // Assumes userId is set by middleware
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

		// Retrieve user document
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const updateData: Partial<typeof user> = {};

		// Handle password update if both current and new passwords are provided
		if (currentPassword && newPassword) {
			const isPasswordCorrect = await bcrypt.compare(
				currentPassword,
				user.password,
			);
			if (!isPasswordCorrect)
				return res
					.status(400)
					.json({ message: "Current password is incorrect" });
			updateData.password = await bcrypt.hash(newPassword, 10);
		}

		// Conditionally add other fields to the update data if they are provided
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (dateBirth) updateData.dateBirth = dateBirth;
		if (email) updateData.email = email;
		if (userName) updateData.userName = userName;
		if (description) updateData.description = description;

		// Upload profile image to Cloudinary if provided
		if (req.file) {
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
		res.status(500).json({ message: "Failed to update profile", error });
	}
};

export const getUserProfile = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.userId;
		if (!userId)
			return res.status(400).json({ message: "User ID is required" });

		const user = await User.findById(userId).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res
			.status(500)
			.json({ message: "Failed to fetch user profile", error: error.message });
	}
};

// Add address function
export const addAddress = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const newAddress = req.body; // Expects address data in the request body

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.addresses.push(newAddress);
		await user.save();

		res.status(201).json({
			message: "Address added successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error adding address:", error);
		res.status(500).json({ message: "Failed to add address", error });
	}
};

// Update address function
export const updateAddress = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;
		const updatedAddress = req.body;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const address = user.addresses.id(addressId);
		if (!address) return res.status(404).json({ message: "Address not found" });

		Object.assign(address, updatedAddress);
		await user.save();

		res.status(200).json({
			message: "Address updated successfully",
			addresses: user.addresses,
		});
	} catch (error) {
		console.error("Error updating address:", error);
		res.status(500).json({ message: "Failed to update address", error });
	}
};

// Delete address function
export const deleteAddress = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

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
		res.status(500).json({ message: "Failed to delete address", error });
	}
};


// payment methodes schamas start here

export const addPayment = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const newPayment = req.body; // Assumes payment data is in the request body

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		// Add the new payment to the user's payments array
		user.payments.push(newPayment);
		await user.save();

		res.status(201).json({
			message: "Payment method added successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error adding payment:", error);
		res.status(500).json({ message: "Failed to add payment method", error });
	}
};

export const updatePayment = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;
		const updatedPayment = req.body;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const payment = user.payments.id(paymentId);
		if (!payment)
			return res.status(404).json({ message: "Payment method not found" });

		// Update the payment details
		Object.assign(payment, updatedPayment);
		await user.save();

		res.status(200).json({
			message: "Payment method updated successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error updating payment:", error);
		res.status(500).json({ message: "Failed to update payment method", error });
	}
};

export const deletePayment = async (req: Request, res: Response) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		// Filter out the payment method to delete
		user.payments = user.payments.filter(
			payment => payment._id.toString() !== paymentId,
		);
		await user.save();

		res.status(200).json({
			message: "Payment method deleted successfully",
			payments: user.payments,
		});
	} catch (error) {
		console.error("Error deleting payment:", error);
		res.status(500).json({ message: "Failed to delete payment method", error });
	}
};

