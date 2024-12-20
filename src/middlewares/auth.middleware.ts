import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

interface CustomRequest extends Request {
	user?: {
		userId: string;
		role: string;
	};
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
			// Verify token and check expiration
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
				userId: string;
				role: string;
			};

			req.user = { userId: decoded.userId, role: decoded.role, };

			// Role-based access check
			if (roles && !roles.includes(decoded.role)) {
				res
					.status(403)
					.json({ message: "Access denied: insufficient permissions." });
				return;
			}

			next();
		} catch (error) {
			console.error("JWT Verification Error:", error);
			res.status(401).json({ message: "Invalid or expired token." });
		}
	};
};
