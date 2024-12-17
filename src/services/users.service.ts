import User, { IUser } from "../models/User.model";

// Fetch User Profile by User ID
export const fetchUserProfile = async (
	userId: string,
): Promise<IUser | null> => {
	return User.findById(userId);
};

// Save or Update User Profile
export const saveUserProfile = async (
	userId: string,
	profileData: Partial<IUser>, // Use Partial<IUser> to allow updating only specific fields
): Promise<IUser | null> => {
	return User.findByIdAndUpdate(userId, profileData, { new: true });
};
