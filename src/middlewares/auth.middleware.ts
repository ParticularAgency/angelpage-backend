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

		// Check if the Authorization header exists and starts with "Bearer"
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			res.status(401).json({ message: "Access denied. No token provided." });
			return; // Ensure no further middleware execution
		}

		// Extract token from the Authorization header
		const token = authHeader.replace("Bearer ", "");

		try {
			// Verify the token and decode its payload
			const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
				userId: string;
				role: string;
			};

			// Attach the user data to the request object
			req.user = { userId: decoded.userId, role: decoded.role };

			// Check if roles are specified and whether the user's role matches
			if (roles && !roles.includes(decoded.role)) {
				res
					.status(403)
					.json({ message: "Access denied: insufficient permissions." });
				return; // Ensure no further middleware execution
			}

			// Call the next middleware in the chain
			next();
		} catch (error) {
			console.error("JWT Verification Error:", error);
			res.status(400).json({ message: "Invalid or expired token." });
		}
	};
};
