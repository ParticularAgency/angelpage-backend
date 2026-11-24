"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.exportOperationsOrdersCsv = exports.resolveDispute = exports.releaseEscrow = exports.getEscrowQueue = exports.getOperationsDisputes = exports.getOperationsOrders = void 0;
const Order_model_1 = __importDefault(require("../../models/Order.model"));
const escrowAutoRelease_service_js_1 = require("../../services/escrowAutoRelease.service.js");
const getOperationsOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, paymentStatus, limit = 50, page = 1 } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (paymentStatus)
            query.paymentStatus = paymentStatus;
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = yield Promise.all([
            Order_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("buyerId", "firstName lastName email"),
            Order_model_1.default.countDocuments(query),
        ]);
        res.status(200).json({
            orders,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        });
    }
    catch (error) {
        console.error("getOperationsOrders:", error);
        res.status(500).json({ message: "Failed to fetch orders." });
    }
});
exports.getOperationsOrders = getOperationsOrders;
const getOperationsDisputes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_model_1.default.find({
            $or: [
                { disputeStatus: { $exists: true, $ne: null, $ne: "NONE" } },
                { escrowStatus: "DISPUTED" },
            ],
        })
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate("buyerId", "firstName lastName email");
        res.status(200).json({ disputes: orders });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch disputes." });
    }
});
exports.getOperationsDisputes = getOperationsDisputes;
const getEscrowQueue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const orders = yield Order_model_1.default.find({
            escrowStatus: "HELD",
            paymentStatus: "Paid",
        })
            .sort({ escrowReleaseAt: 1 })
            .limit(100);
        const ready = orders.filter((o) => o.escrowReleaseAt && new Date(o.escrowReleaseAt) <= now);
        const pending = orders.filter((o) => !o.escrowReleaseAt || new Date(o.escrowReleaseAt) > now);
        res.status(200).json({ ready, pending, total: orders.length });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch escrow queue." });
    }
});
exports.getEscrowQueue = getEscrowQueue;
const releaseEscrow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId } = req.params;
        const result = yield (0, escrowAutoRelease_service_js_1.releaseEscrowForOrder)(orderId);
        if (result.skipped) {
            return res.status(400).json({ message: "Escrow already released." });
        }
        const order = yield Order_model_1.default.findById(orderId);
        const { logAudit } = yield Promise.resolve().then(() => __importStar(require("../../utils/auditLog.js")));
        yield logAudit({
            actorId: req.user.userId,
            actorRole: req.user.role,
            action: "ESCROW_RELEASED",
            entityType: "order",
            entityId: orderId,
        });
        res.status(200).json({ message: "Escrow released.", order });
    }
    catch (error) {
        console.error("releaseEscrow:", error);
        const status = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("not found")) ? 404 : 400;
        res.status(status).json({ message: error.message || "Failed to release escrow." });
    }
});
exports.releaseEscrow = releaseEscrow;
const resolveDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { resolution, releaseEscrow: shouldRelease } = req.body;
        const order = yield Order_model_1.default.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }
        if (order.disputeStatus !== "OPEN") {
            return res.status(400).json({ message: "No open dispute on this order." });
        }
        order.disputeStatus = "RESOLVED";
        order.disputeNotes = [order.disputeNotes, resolution].filter(Boolean).join(" | Admin: ");
        if (shouldRelease && order.escrowStatus === "DISPUTED") {
            order.escrowStatus = "HELD";
        }
        yield order.save();
        let releaseResult = null;
        if (shouldRelease) {
            try {
                releaseResult = yield (0, escrowAutoRelease_service_js_1.releaseEscrowForOrder)(orderId);
            }
            catch (e) {
                console.error("resolveDispute release:", e);
                return res.status(200).json({
                    message: "Dispute resolved, but escrow release failed. Release manually from the escrow queue.",
                    order,
                    escrowError: e.message,
                });
            }
        }
        const { logAudit } = yield Promise.resolve().then(() => __importStar(require("../../utils/auditLog.js")));
        yield logAudit({
            actorId: req.user.userId,
            actorRole: req.user.role,
            action: "DISPUTE_RESOLVED",
            entityType: "order",
            entityId: orderId,
            meta: { resolution, shouldRelease: Boolean(shouldRelease) },
        });
        res.status(200).json({
            message: shouldRelease
                ? "Dispute resolved and escrow release attempted."
                : "Dispute resolved. Escrow remains held until release.",
            order: yield Order_model_1.default.findById(orderId),
            releaseResult,
        });
    }
    catch (error) {
        console.error("resolveDispute:", error);
        res.status(500).json({ message: "Failed to resolve dispute." });
    }
});
exports.resolveDispute = resolveDispute;
const exportOperationsOrdersCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_model_1.default.find({})
            .sort({ createdAt: -1 })
            .limit(5000)
            .populate("buyerId", "email firstName lastName");
        const header = "orderId,status,paymentStatus,grandTotal,escrowStatus,disputeStatus,createdAt,buyerEmail\n";
        const rows = orders.map(o => {
            var _a, _b, _c, _d;
            const email = o.guestEmail || ((_a = o.buyerId) === null || _a === void 0 ? void 0 : _a.email) || "";
            return [
                o._id,
                o.status,
                o.paymentStatus,
                ((_b = o.grandTotal) === null || _b === void 0 ? void 0 : _b.toFixed(2)) || "0",
                o.escrowStatus || "",
                o.disputeStatus || "NONE",
                ((_d = (_c = o.createdAt) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || "",
                email,
            ].join(",");
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=orders-export.csv");
        res.send(header + rows.join("\n"));
    }
    catch (error) {
        res.status(500).json({ message: "Export failed." });
    }
});
exports.exportOperationsOrdersCsv = exportOperationsOrdersCsv;
