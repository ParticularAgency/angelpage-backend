// import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import Charity from "../../models/Charity.model";
import bcrypt from "bcryptjs";

// Update profile function
export const updateProfile = async (req, res) => {
	try {
		const { userId } = req.user; // Assumes userId is set by middleware
		const {
			firstName,
			lastName,
			dateBirth,
			email,
			userName,
			description,
			charityPhone,
			websiteLink,
			currentPassword,
			newPassword,
		} = req.body;

		// Retrieve user document
		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const updateData = {};

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
		if (charityPhone) updateData.charityPhone = charityPhone;
		if (websiteLink) updateData.websiteLink = websiteLink;
		if (description) updateData.description = description;

		// Handle profile image upload
		if (req.files && req.files.profileImage) {
			const result = await cloudinary.uploader.upload(
				req.files.profileImage[0].path,
				{
					folder: "user_profiles",
					public_id: `user_${userId}`,
					overwrite: true,
				},
			);
			updateData.profileImage = result.secure_url;
		}

		// Handle charity banner image upload
		if (req.files && req.files.charityBannerImage) {
			const result = await cloudinary.uploader.upload(
				req.files.charityBannerImage[0].path,
				{
					folder: "charity_images",
					public_id: `charity_${userId}`,
					overwrite: true,
				},
			);
			updateData.charityBannerImage = result.secure_url;
		}
		const updatedUser = await Charity.findByIdAndUpdate(userId, updateData, {
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

// Get charity profile function
export const getCharityProfile = async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId)
			return res.status(400).json({ message: "User ID is required" });

		const user = await Charity.findById(userId).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res
			.status(500)
			.json({ message: "Failed to fetch user profile", error: error.message });
	}
};

// Update profile function
export const updateCharityAdminInfo = async (req, res) => {
	try {
		const { userId } = req.user; // userId should be set by the auth middleware
		const { charityName, charityNumber, charityID, description,phoneNumber,websiteLink } = req.body;

		const user = await Charity.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		Object.assign(user, {
			charityName,
			charityNumber,
			charityID,
			description,
			phoneNumber,
			websiteLink,
		});

		await user.save();
		res.status(200).json({ message: "Profile updated successfully", user });
	} catch (error) {
		console.error("Error updating profile:", error);
		res.status(500).json({ message: "Failed to update profile", error });
	}
};

// Get charity profile function
export const getCharityAdminInfo = async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId)
			return res.status(400).json({ message: "User ID is required" });

		const user = await Charity.findById(userId).select("-password");
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
export const addAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const newAddress = req.body; // Expects address data in the request body

		const user = await Charity.findById(userId);
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
export const updateAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;
		const updatedAddress = req.body;

		const user = await Charity.findById(userId);
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
export const deleteAddress = async (req, res) => {
	try {
		const { userId } = req.user;
		const { addressId } = req.params;

		const user = await Charity.findById(userId);
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

export const addPayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const newPayment = req.body; // Assumes payment data is in the request body

		const user = await Charity.findById(userId);
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

export const updatePayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;
		const updatedPayment = req.body;

		const user = await Charity.findById(userId);
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

export const deletePayment = async (req, res) => {
	try {
		const { userId } = req.user;
		const { paymentId } = req.params;

		const user = await Charity.findById(userId);
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


// Storefront data - Public Access
export const getStorefrontData = async (req, res) => {
	try {
		const { storefrontid } = req.params;

		// Logging received storefront ID
		console.log("Received storefrontid:", storefrontid);

		// Query the charity using the provided storefront ID
		const charity = await Charity.findOne({ storefrontId: storefrontid })
			.select(
				"charityName charityNumber storefrontId description profileImage charityBannerImage addresses listedProducts"
			)
			.populate("listedProducts");

		// Check if the charity exists
		if (!charity) {
			console.log("No charity found for storefrontId:", storefrontid);
			return res.status(404).json({ message: "Charity not found" });
		}

		// Respond with the charity data
		console.log("Charity data:", charity);
		res.status(200).json({ charity });
	} catch (error) {
		console.error("Error fetching storefront data:", error);
		res.status(500).json({ message: "Failed to fetch storefront data", error: error.message });
	}
};


export const getCharityList = async (req, res) => {
	try {
		const charities = await Charity.find(); // You can add filters as needed (e.g., status: 'approved')
		res.status(200).json({ charities });
	} catch (error) {
		console.error("Error fetching charities:", error);
		res.status(500).json({ message: "Error fetching charities" });
	}
};

// Get Charity Details - Public Access
export const getCharityDetails = async (req, res) => {
	try {
		const { charityid } = req.params; // Correctly retrieve `charityid`
		if (!charityid) {
			return res.status(400).json({ message: 'Charity ID is required' });
		}

		const charity = await Charity.findById(charityid)
			.select(
				'charityName charityNumber description phoneNumber websiteLink profileImage charityBannerImage addresses listedProducts'
			)
			.populate('listedProducts');

		if (!charity) {
			return res.status(404).json({ message: 'Charity not found' });
		}

		res.status(200).json({ charity });
	} catch (error) {
		console.error('Error fetching charity details:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
