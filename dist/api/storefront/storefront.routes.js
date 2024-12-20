"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import { authMiddleware } from "../../middlewares/auth.middleware";
const storefront_controller_1 = require("./storefront.controller");
const router = (0, express_1.Router)();
router.get("/:storefrontid", storefront_controller_1.getStorefrontData);
router.get("/:storefrontid/products", storefront_controller_1.getCharityProductsByStorefrontId);
exports.default = router;
