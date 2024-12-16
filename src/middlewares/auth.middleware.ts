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
	return (req: CustomRequest, res: Response, next: NextFunction) => {
		const authHeader = req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res
				.status(401)
				.json({ message: "Access denied. No token provided." });
		}

		const token = authHeader.replace("Bearer ", "");
     
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
				userId: string;
				role: string;
			};
			req.user = { userId: decoded.userId, role: decoded.role };

			if (roles && !roles.includes(decoded.role)) {
				return res
					.status(403)
					.json({ message: "Access denied: insufficient permissions." });
			}

			next();
		} catch (error) {
			console.error("JWT Verification Error:", error);
			res.status(400).json({ message: "Invalid or expired token." });
		}
	};
};
