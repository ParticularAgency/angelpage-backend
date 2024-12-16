import { Router } from "express";
import { registerUser, loginUser } from "../api/auth/auth.controller";
import { authMiddleware } from "./auth.middleware";

const router = Router();

// Public routes for registration and login
router.post("/register", registerUser);
router.post("/login", loginUser);

// -------------------
// Admin Routes
// -------------------
const adminRouter = Router();

adminRouter.use(authMiddleware(["ADMIN"])); // Apply middleware to all admin routes
adminRouter.get("/", (req, res) => {
	res.json({ message: "Welcome, Admin!" });
});

// Any additional admin-specific routes can be added here
// adminRouter.post("/dashboard", adminDashboardController);

// Mount admin routes
router.use("/admin", adminRouter);

// -------------------
// User Routes
// -------------------
const userRouter = Router();

userRouter.use(authMiddleware(["USER"])); // Apply middleware to all user routes
userRouter.get("/", (req, res) => {
	res.json({ message: "Welcome, User!" });
});

// Any additional user-specific routes can be added here
// userRouter.get("/profile", userProfileController);

// Mount user routes
router.use("/users", userRouter);

// -------------------
// Charity Routes
// -------------------
const charityRouter = Router();

charityRouter.use(authMiddleware(["CHARITY"])); // Apply middleware to all charity routes
charityRouter.get("/", (req, res) => {
	res.json({ message: "Welcome, Charity!" });
});

// Any additional charity-specific routes can be added here
// charityRouter.get("/dashboard", charityDashboardController);

// Mount charity routes
router.use("/charity", charityRouter);

// -------------------
// Routes for Multiple Roles
// -------------------
router.get("/admin-user", authMiddleware(["ADMIN", "USER"]), (req, res) => {
	res.json({ message: "Welcome, Admin or User!" });
});

router.get("/charity-user", authMiddleware(["CHARITY", "USER"]), (req, res) => {
	res.json({ message: "Welcome, Charity or User!" });
});

export default router;
