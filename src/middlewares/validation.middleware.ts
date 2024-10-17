// src/middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

// Example validation rules for user registration
export const validateUser = [
	body("name").isString().notEmpty().withMessage("Name is required"),
	body("email").isEmail().withMessage("Email is required and should be valid"),
	body("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters long"),
	(req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		next();
	},
];
