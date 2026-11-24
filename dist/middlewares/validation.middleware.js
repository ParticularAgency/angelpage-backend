"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = exports.validatePaymentMethod = exports.validateRegister = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            message: "Validation failed",
            errors: errors.array(),
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/** Public registration — USER | CHARITY only */
exports.validateRegister = [
    (0, express_validator_1.body)("role")
        .isIn(["USER", "CHARITY"])
        .withMessage("Role must be USER or CHARITY"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("firstName").isString().trim().notEmpty().withMessage("First name is required"),
    (0, express_validator_1.body)("lastName").isString().trim().notEmpty().withMessage("Last name is required"),
    (0, express_validator_1.body)("accountNumber").not().exists().withMessage("Card numbers are not allowed"),
    (0, express_validator_1.body)("cvvNumber").not().exists().withMessage("CVV is not allowed"),
    exports.handleValidationErrors,
];
/** Profile payment methods — billing metadata only */
exports.validatePaymentMethod = [
    (0, express_validator_1.body)("nameAccountHolder")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Account holder name is required"),
    (0, express_validator_1.body)("accountNumber").not().exists().withMessage("Card numbers are not allowed"),
    (0, express_validator_1.body)("cardNumber").not().exists().withMessage("Card numbers are not allowed"),
    (0, express_validator_1.body)("cvvNumber").not().exists().withMessage("CVV is not allowed"),
    (0, express_validator_1.body)("cvv").not().exists().withMessage("CVV is not allowed"),
    (0, express_validator_1.body)("expiryDate").not().exists().withMessage("Card expiry is not allowed"),
    (0, express_validator_1.body)("stripePaymentMethodId")
        .optional()
        .isString()
        .matches(/^pm_/)
        .withMessage("stripePaymentMethodId must be a Stripe pm_ id"),
    exports.handleValidationErrors,
];
// Legacy alias
exports.validateUser = exports.validateRegister;
