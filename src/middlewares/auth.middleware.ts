import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { isAdminRole } from "../constants/adminRoles.js";
import { JWT_SECRET } from "../config/jwtSecret.js";

export interface AuthUser {
	userId: string;
	role: string;
	charityId?: string;
	permissions?: string[];
}

export interface CustomRequest extends Request {
	user?: AuthUser;
}

export const authMiddleware = (roles?: string[]) => {
	return (req: CustomRequest, res: Response, next: NextFunction): void => {
		const authHeader = req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			res.status(401).json({ message: "Access denied. No token provided." });
			return;
		}

		const token = authHeader.replace("Bearer ", "");

		try {
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
				userId: string;
				role: string;
				charityId?: string;
				permissions?: string[];
				type?: string;
			};

			if (decoded.type === "refresh") {
				res.status(401).json({ message: "Access token required." });
				return;
			}

			req.user = {
				userId: decoded.userId,
				role: decoded.role,
				charityId: decoded.charityId,
				permissions: decoded.permissions || [],
			};

			if (roles) {
				const userRole = decoded.role;
				const allowed = roles.some(r => {
					if (r === "ADMIN" && isAdminRole(userRole)) return true;
					if (r === "CHARITY" && userRole === "CHARITY_STAFF") return true;
					return r === userRole;
				});
				if (!allowed) {
					res
						.status(403)
						.json({ message: "Access denied: insufficient permissions." });
					return;
				}
			}

			next();
		} catch (error) {
			console.error("JWT Verification Error:", error);
			res.status(401).json({ message: "Invalid or expired token." });
		}
	};
};
