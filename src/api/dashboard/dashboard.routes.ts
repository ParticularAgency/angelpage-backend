import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getDashboardOverview, getUserEarnings, exportUserOrdersCsv } from "./dashboard.controller";

const router = Router();

router.get("/overview", authMiddleware(), getDashboardOverview);
router.get("/earnings", authMiddleware(["USER"]), getUserEarnings);
router.get("/export/orders", authMiddleware(), exportUserOrdersCsv);

export default router;
