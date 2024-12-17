"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const storefront_controller_1 = require("./storefront.controller");
const router = (0, express_1.Router)();
router.get("/:storefrontid", (0, auth_middleware_1.authMiddleware)(), storefront_controller_1.getStorefrontData);
exports.default = router;
