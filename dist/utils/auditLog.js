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
exports.logAudit = void 0;
const AuditLog_model_1 = __importDefault(require("../models/AuditLog.model"));
const logAudit = (_a) => __awaiter(void 0, [_a], void 0, function* ({ actorId, actorRole, action, entityType, entityId = "", details = {}, }) {
    try {
        yield AuditLog_model_1.default.create({
            actorId,
            actorRole,
            action,
            entityType,
            entityId: String(entityId),
            details,
        });
    }
    catch (err) {
        console.error("audit log failed:", err.message);
    }
});
exports.logAudit = logAudit;
