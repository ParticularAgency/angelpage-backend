/** Roles that operate on behalf of a charity storefront */
export const CHARITY_ACCOUNT_ROLES = ["CHARITY", "CHARITY_STAFF"];

export const isCharityAccountRole = (role) =>
	CHARITY_ACCOUNT_ROLES.includes(role);

/** Mongo id of the charity account (owner), including staff acting on behalf of parent */
export const resolveCharityId = (user) => {
	if (!user) return null;
	if (user.role === "CHARITY") return user.userId;
	if (user.role === "CHARITY_STAFF" && user.charityId) return user.charityId;
	return null;
};
