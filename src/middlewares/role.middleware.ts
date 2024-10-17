import { Request, Response, NextFunction } from "express";

const roleMiddleware = (roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const userRole = req.user?.role; // Assuming the user role is set in req.user

		if (!userRole || !roles.includes(userRole)) {
			return res
				.status(403)
				.json({
					message: "Access denied. You do not have the right permissions.",
				});
		}

		next();
	};
};

export default roleMiddleware;
