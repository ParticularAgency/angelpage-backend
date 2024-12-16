import User from "../models/User.model";

export const fetchUserProfile = async (userId: string) => {
	return User.findById(userId);
};

export const saveUserProfile = async (userId: string, profileData: any) => {
	return User.findByIdAndUpdate(userId, profileData, { new: true });
};
