import Charity from "../models/Charity.model";

export const fetchCharityProfile = async (charityId: string) => {
	return Charity.findById(charityId);
};

export const saveCharityProfile = async (
	charityId: string,
	profileData: any,
) => {
	return Charity.findByIdAndUpdate(charityId, profileData, { new: true });
};
