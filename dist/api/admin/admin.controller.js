"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboard = void 0;
const admin_service_1 = require("../../services/admin.service");
const getAdminDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield (0, admin_service_1.getDashboardData)();
        res.json(data);
    }
    catch (error) {
        console.error("Error retrieving admin dashboard data:", error); // Log the error
        res
            .status(500)
            .json({ message: "Failed to retrieve admin dashboard data", error });
    }
});
exports.getAdminDashboard = getAdminDashboard;
