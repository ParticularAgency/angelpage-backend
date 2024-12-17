import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getAdminDashboard } from "./admin.controller";

const router = Router();

router.get("/dashboard", authMiddleware(), getAdminDashboard);

export default router;
