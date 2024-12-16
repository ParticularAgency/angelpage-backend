import User from "../../models/User.model";


export const updateUserProfile = async (userId: string, profileData: any) => {
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
	} = req.body;

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
		{ new: true },
	);

	if (!updatedUser) {
		throw new Error("User not found");
	}

	return updatedUser;
};