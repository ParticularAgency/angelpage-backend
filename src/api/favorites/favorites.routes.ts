import express from "express";
import {
	toggleFavorite,
	getFavorites,
	getFavoriteCount,
} from "./favorites.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = express.Router();

// Toggle favorite (add/remove)
router.post("/toggle", authMiddleware(), toggleFavorite);

// Fetch all favorite items for the user
router.get("/added", authMiddleware(), getFavorites);

router.get("/count", authMiddleware(), getFavoriteCount);

export default router;
