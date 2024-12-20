import { Router } from "express";
// import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	getStorefrontData,
	getCharityProductsByStorefrontId,
} from "./storefront.controller";

const router = Router();

router.get("/:storefrontid",  getStorefrontData);
router.get("/:storefrontid/products", getCharityProductsByStorefrontId);

export default router;
