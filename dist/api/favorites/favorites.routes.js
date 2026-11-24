"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const favorites_controller_1 = require("./favorites.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = express_1.default.Router();
// Toggle favorite (add/remove)
router.post("/toggle", (0, auth_middleware_1.authMiddleware)(), favorites_controller_1.toggleFavorite);
// Fetch all favorite items for the user
router.get("/added", (0, auth_middleware_1.authMiddleware)(), favorites_controller_1.getFavorites);
// Get favorite count
router.get("/count", (0, auth_middleware_1.authMiddleware)(), favorites_controller_1.getFavoriteCount);
exports.default = router;
