import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
	listConnections,
	createConnection,
	updateConnection,
	deleteConnection,
	testConnection,
	syncConnection,
	getAffiliateProducts,
	patchAffiliateProduct,
	deleteAffiliateProduct,
	importEbayFeedAdmin,
} from "./affiliate.controller.js";

const router = Router();

router.get("/connections", authMiddleware(["USER", "CHARITY", "ADMIN"]), listConnections);
router.post("/connections", authMiddleware(["USER", "CHARITY", "ADMIN"]), createConnection);
router.put(
	"/connections/:connectionId",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	updateConnection,
);
router.delete(
	"/connections/:connectionId",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	deleteConnection,
);
router.post(
	"/connections/:connectionId/test",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	testConnection,
);
router.post(
	"/connections/:connectionId/sync",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	syncConnection,
);

router.get("/products", authMiddleware(["USER", "CHARITY", "ADMIN"]), getAffiliateProducts);
router.patch(
	"/products/:productId",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	patchAffiliateProduct,
);
router.delete(
	"/products/:productId",
	authMiddleware(["USER", "CHARITY", "ADMIN"]),
	deleteAffiliateProduct,
);

router.post("/ebay/import", authMiddleware(["ADMIN"]), importEbayFeedAdmin);

export default router;
