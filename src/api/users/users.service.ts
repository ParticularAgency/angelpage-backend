import User from "../../models/User.model";

interface ProfileData {
	firstName?: string;
	lastName?: string;
	dateBirth?: string;
	email?: string;
	userName?: string;
	profileImage?: string;
	newPassword?: string;
	currentPassword?: string;
	addresses?: [];
}

export const updateUserProfile = async (
	userId: string,
	profileData: ProfileData,
) => {
	const {
		firstName,
		lastName,
		dateBirth,
		email,
		userName,
		profileImage,
		newPassword,
		currentPassword,
		addresses,
	} = profileData; // Extract properties from the passed profileData object

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{
			firstName,
			lastName,
			dateBirth,
			profileImage,
			email,
			userName,
			newPassword,
			currentPassword,
			addresses,
		},
		{ new: true }, // Return the updated document
	);

	if (!updatedUser) {
		throw new Error("User not found");
	}

	return updatedUser;
};
