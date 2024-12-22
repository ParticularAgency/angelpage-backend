import express from "express";
import { subscribe, contactUs } from "./email.controller";

const router = express.Router();

// Route for subscribing
router.post("/subscribe", subscribe);
router.post("/contact", contactUs);

export default router;
