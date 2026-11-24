"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCharityId = exports.isCharityAccountRole = exports.CHARITY_ACCOUNT_ROLES = void 0;
/** Roles that operate on behalf of a charity storefront */
exports.CHARITY_ACCOUNT_ROLES = ["CHARITY", "CHARITY_STAFF"];
const isCharityAccountRole = (role) => exports.CHARITY_ACCOUNT_ROLES.includes(role);
exports.isCharityAccountRole = isCharityAccountRole;
/** Mongo id of the charity account (owner), including staff acting on behalf of parent */
const resolveCharityId = (user) => {
    if (!user)
        return null;
    if (user.role === "CHARITY")
        return user.userId;
    if (user.role === "CHARITY_STAFF" && user.charityId)
        return user.charityId;
    return null;
};
exports.resolveCharityId = resolveCharityId;
