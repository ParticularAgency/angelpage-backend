// src/routes/index.ts
import { Router } from "express";
import usersRoutes from "../api/users/users.routes"; // Adjust the path as necessary

const router = Router();

// Simple health check route
router.get("/health", (req, res) => {
	res.status(200).json({ message: "Server is running" });
});

// User routes
router.use("/users", usersRoutes); // All user-related routes will be prefixed with /users

export default router;
