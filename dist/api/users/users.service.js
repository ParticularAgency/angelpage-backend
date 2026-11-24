"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = void 0;
const User_model_1 = __importDefault(require("../../models/User.model"));
const updateUserProfile = (userId, profileData) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, dateBirth, email, userName, profileImage, newPassword, currentPassword, addresses, } = profileData; // Extract properties from the passed profileData object
    const updatedUser = yield User_model_1.default.findByIdAndUpdate(userId, {
        firstName,
        lastName,
        dateBirth,
        profileImage,
        email,
        userName,
        newPassword,
        currentPassword,
        addresses,
    }, { new: true });
    if (!updatedUser) {
        throw new Error("User not found");
    }
    return updatedUser;
});
exports.updateUserProfile = updateUserProfile;
