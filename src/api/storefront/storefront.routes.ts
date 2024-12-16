import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {

	getStorefrontData,
} from "./storefront.controller";

const router = Router();

router.get("/:storefrontid", authMiddleware(), getStorefrontData);

export default router;
