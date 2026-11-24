import Order from "../../models/Order.model";
import { releaseEscrowForOrder } from "../../services/escrowAutoRelease.service.js";

export const getOperationsOrders = async (req, res) => {
	try {
		const { status, paymentStatus, limit = 50, page = 1 } = req.query;
		const query = {};
		if (status) query.status = status;
		if (paymentStatus) query.paymentStatus = paymentStatus;

		const skip = (Number(page) - 1) * Number(limit);
		const [orders, total] = await Promise.all([
			Order.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(Number(limit))
				.populate("buyerId", "firstName lastName email"),
			Order.countDocuments(query),
		]);

		res.status(200).json({
			orders,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / Number(limit)),
		});
	} catch (error) {
		console.error("getOperationsOrders:", error);
		res.status(500).json({ message: "Failed to fetch orders." });
	}
};

export const getOperationsDisputes = async (req, res) => {
	try {
		const orders = await Order.find({
			$or: [
				{ disputeStatus: { $exists: true, $ne: null, $ne: "NONE" } },
				{ escrowStatus: "DISPUTED" },
			],
		})
			.sort({ updatedAt: -1 })
			.limit(100)
			.populate("buyerId", "firstName lastName email");

		res.status(200).json({ disputes: orders });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch disputes." });
	}
};

export const getEscrowQueue = async (req, res) => {
	try {
		const now = new Date();
		const orders = await Order.find({
			escrowStatus: "HELD",
			paymentStatus: "Paid",
		})
			.sort({ escrowReleaseAt: 1 })
			.limit(100);

		const ready = orders.filter(
			(o) => o.escrowReleaseAt && new Date(o.escrowReleaseAt) <= now,
		);
		const pending = orders.filter(
			(o) => !o.escrowReleaseAt || new Date(o.escrowReleaseAt) > now,
		);

		res.status(200).json({ ready, pending, total: orders.length });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch escrow queue." });
	}
};

export const releaseEscrow = async (req, res) => {
	try {
		const { orderId } = req.params;
		const result = await releaseEscrowForOrder(orderId);

		if (result.skipped) {
			return res.status(400).json({ message: "Escrow already released." });
		}

		const order = await Order.findById(orderId);
		const { logAudit } = await import("../../utils/auditLog.js");
		await logAudit({
			actorId: req.user.userId,
			actorRole: req.user.role,
			action: "ESCROW_RELEASED",
			entityType: "order",
			entityId: orderId,
		});
		res.status(200).json({ message: "Escrow released.", order });
	} catch (error) {
		console.error("releaseEscrow:", error);
		const status = error.message?.includes("not found") ? 404 : 400;
		res.status(status).json({ message: error.message || "Failed to release escrow." });
	}
};

export const resolveDispute = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { resolution, releaseEscrow: shouldRelease } = req.body;

		const order = await Order.findById(orderId);
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
		await order.save();

		let releaseResult = null;
		if (shouldRelease) {
			try {
				releaseResult = await releaseEscrowForOrder(orderId);
			} catch (e) {
				console.error("resolveDispute release:", e);
				return res.status(200).json({
					message:
						"Dispute resolved, but escrow release failed. Release manually from the escrow queue.",
					order,
					escrowError: e.message,
				});
			}
		}

		const { logAudit } = await import("../../utils/auditLog.js");
		await logAudit({
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
			order: await Order.findById(orderId),
			releaseResult,
		});
	} catch (error) {
		console.error("resolveDispute:", error);
		res.status(500).json({ message: "Failed to resolve dispute." });
	}
};

export const exportOperationsOrdersCsv = async (req, res) => {
	try {
		const orders = await Order.find({})
			.sort({ createdAt: -1 })
			.limit(5000)
			.populate("buyerId", "email firstName lastName");

		const header = "orderId,status,paymentStatus,grandTotal,escrowStatus,disputeStatus,createdAt,buyerEmail\n";
		const rows = orders.map(o => {
			const email = o.guestEmail || o.buyerId?.email || "";
			return [
				o._id,
				o.status,
				o.paymentStatus,
				o.grandTotal?.toFixed(2) || "0",
				o.escrowStatus || "",
				o.disputeStatus || "NONE",
				o.createdAt?.toISOString?.() || "",
				email,
			].join(",");
		});

		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", "attachment; filename=orders-export.csv");
		res.send(header + rows.join("\n"));
	} catch (error) {
		res.status(500).json({ message: "Export failed." });
	}
};
