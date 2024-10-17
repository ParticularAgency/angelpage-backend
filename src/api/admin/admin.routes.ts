// src/api/admin/admin.routes.ts
import { Router } from "express";
import {
	updateAdminProfile,
	setAdminContentAccess,
	addAdmin,
} from "./admin.controller";
import authMiddleware from "../middlewares/auth.middleware";

const router = Router();

// Route to update the admin's own profile
router.put("/profile", authMiddleware, updateAdminProfile);

// Route for superadmin to set content access for other admins
router.put("/content-access", authMiddleware, setAdminContentAccess);

// Superadmin route to add a new admin
router.post("/add", authMiddleware, addAdmin);

export default router;
