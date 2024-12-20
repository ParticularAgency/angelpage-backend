
import cloudinary from "../../config/cloudinary";
import Admin from "../../models/Admin.model";
import User from '../../models/User.model'; 
import Charity from '../../models/Charity.model'; 
import Product from "../../models/Product.model";
import bcrypt from "bcryptjs";


// Utility to handle unknown error types
const handleUnknownError = (error) =>
	error instanceof Error ? error.message : "An unknown error occurred";

// Update User Profile
export const updateProfile = async (
	req,
	res,
) => {
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

		const user = await Admin.findById(userId);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const updateData = {};

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

		const updatedUser = await Admin.findByIdAndUpdate(userId, updateData, {
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
export const getAdminData = async (
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const user = await Admin.findById(userId).select("-password");
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const newAddress = req.body;

		const user = await Admin.findById(userId);
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		const { addressId } = req.params;
		const updatedAddress = req.body;

		const user = await Admin.findById(userId);
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		const { addressId } = req.params;

		const user = await Admin.findById(userId);
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		const newPayment = req.body;
        
		const user = await Admin.findById(userId);
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		const { paymentId } = req.params;
		const updatedPayment = req.body;

		const user = await Admin.findById(userId);
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
	req,
	res,
) => {
	try {
		const userId = req.user?.userId;
		const { paymentId } = req.params;

		const user = await Admin.findById(userId);
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

// Fetch all items with status "LIVE"
export const getLiveProducts = async (
	req,
	res,
) => {
  try {
    // Fetch all products with status "LIVE"
    const liveProducts = await Product.find({ status: "LIVE" })
      .populate("seller", "firstName lastName profileImage addresses")
      .populate("charity", "charityName charityID storefrotnId profileImage addresses")
      .select(
        "name price images category subcategory dimensions brand material size status createdAt"
      )
      .sort({ createdAt: -1 }); // Sort by most recent

    // Check if there are live products
    if (!liveProducts || liveProducts.length === 0) {
      return res.status(404).json({ message: "No ready for sell products found." });
    }

    // Return the live products
    res.status(200).json({ products: liveProducts });
  } catch (error) {
    console.error("Error fetching live products:", error);
    res.status(500).json({ message: "Failed to fetch live products." });
  }
};



export const getTotalPlatformUsersWithDuration = async (
	req,
	res
) => {
	try {
		const users = await User.find({ role: "USER" });
		const charities = await Charity.find({ role: "CHARITY" });

		const formattedUsers = users.map(user => ({
			id: user._id,
			name: `${user.firstName} ${user.lastName}`,
			email: user.email,
			profileImage: user.profileImage,
			duration: calculateDuration(user.createdAt),
			role: "USER",
			userId: user.userId,
		}));

		const formattedCharities = charities.map(charity => ({
			id: charity._id,
			name: charity.charityName,
			email: charity.email,
			profileImage: charity.profileImage,
			duration: calculateDuration(charity.createdAt),
			role: "CHARITY",
			charityId: charity.charityID,
		}));

		res.status(200).json({
			users: [...formattedUsers, ...formattedCharities],
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Failed to fetch users" });
	}
};

// Helper function to calculate duration
const calculateDuration = (createdAt) => {
	const now = new Date();
	const diff = now.getTime() - new Date(createdAt).getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	if (days < 1) return "Today";
	if (days === 1) return "1 day ago";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
	return `${Math.floor(days / 30)} months ago`;
};

export const deleteUser = async (req, res) => {
	try {
		const { userId } = req.params;

		// Try deleting from both User and Charity collections
		const userDeletion = await User.findOneAndDelete({
			$or: [{ userId }, { _id: userId }],
		});

		const charityDeletion = await Charity.findOneAndDelete({
			$or: [{ charityID: userId }, { _id: userId }],
		});

		if (!userDeletion && !charityDeletion) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({
			message: "User deleted successfully",
			deletedUser: userDeletion || charityDeletion,
		});
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Failed to delete user" });
	}
};
