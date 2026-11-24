import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

export const handleValidationErrors = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			message: "Validation failed",
			errors: errors.array(),
		});
	}
	next();
};

/** Public registration — USER | CHARITY only */
export const validateRegister = [
	body("role")
		.isIn(["USER", "CHARITY"])
		.withMessage("Role must be USER or CHARITY"),
	body("email").isEmail().withMessage("Valid email is required"),
	body("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters"),
	body("firstName").isString().trim().notEmpty().withMessage("First name is required"),
	body("lastName").isString().trim().notEmpty().withMessage("Last name is required"),
	body("accountNumber").not().exists().withMessage("Card numbers are not allowed"),
	body("cvvNumber").not().exists().withMessage("CVV is not allowed"),
	handleValidationErrors,
];

/** Profile payment methods — billing metadata only */
export const validatePaymentMethod = [
	body("nameAccountHolder")
		.isString()
		.trim()
		.notEmpty()
		.withMessage("Account holder name is required"),
	body("accountNumber").not().exists().withMessage("Card numbers are not allowed"),
	body("cardNumber").not().exists().withMessage("Card numbers are not allowed"),
	body("cvvNumber").not().exists().withMessage("CVV is not allowed"),
	body("cvv").not().exists().withMessage("CVV is not allowed"),
	body("expiryDate").not().exists().withMessage("Card expiry is not allowed"),
	body("stripePaymentMethodId")
		.optional()
		.isString()
		.matches(/^pm_/)
		.withMessage("stripePaymentMethodId must be a Stripe pm_ id"),
	handleValidationErrors,
];

// Legacy alias
export const validateUser = validateRegister;
