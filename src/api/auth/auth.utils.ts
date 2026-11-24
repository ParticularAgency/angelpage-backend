import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/jwtSecret.js";

export const hashPassword = async (password: string): Promise<string> => {
	return bcrypt.hash(password, 10);
};

export const comparePassword = async (
	password: string,
	hashedPassword: string,
): Promise<boolean> => {
	return bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (userId: string, role: string): string => {
	return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "1h" });
};
