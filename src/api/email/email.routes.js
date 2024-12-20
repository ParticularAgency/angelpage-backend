import express from "express";
import { subscribe } from "./email.controller";

const router = express.Router();

// Route for subscribing
router.post("/subscribe", subscribe);

export default router;
