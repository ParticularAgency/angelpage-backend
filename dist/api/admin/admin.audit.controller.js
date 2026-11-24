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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const AuditLog_model_1 = __importDefault(require("../../models/AuditLog.model"));
const getAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit = 100, page = 1, action } = req.query;
        const query = action ? { action } : {};
        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = yield Promise.all([
            AuditLog_model_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            AuditLog_model_1.default.countDocuments(query),
        ]);
        res.status(200).json({ logs, total, page: Number(page) });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch audit logs." });
    }
});
exports.getAuditLogs = getAuditLogs;
