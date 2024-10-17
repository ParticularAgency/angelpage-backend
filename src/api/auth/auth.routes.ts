import { Router } from "express";
import { login, register } from "./auth.controller";

const router = Router();

// Define your authentication routes
router.post("/register", register);
router.post("/login", login);

export default router;
