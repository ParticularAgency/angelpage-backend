// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model";

const authMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.header("Authorization")?.replace("Bearer ", "");
	if (!token) {
		return res
			.status(401)
			.json({ message: "Access denied. No token provided." });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET!);
		req.user = decoded;

		const admin = await Admin.findById(req.user._id);
		if (!admin) {
			return res.status(404).json({ message: "Admin not found." });
		}

		req.user.role = admin.role;
		req.user.contentAccess = admin.contentAccess;

		next();
	} catch (error) {
		res.status(400).json({ message: "Invalid token." });
	}
};

export default authMiddleware;
