"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const admin_controller_1 = require("./admin.controller");
const router = (0, express_1.Router)();
router.get("/dashboard", (0, auth_middleware_1.authMiddleware)(), admin_controller_1.getAdminDashboard);
exports.default = router;
