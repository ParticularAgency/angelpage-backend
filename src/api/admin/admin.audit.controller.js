import AuditLog from "../../models/AuditLog.model";

export const getAuditLogs = async (req, res) => {
	try {
		const { limit = 100, page = 1, action } = req.query;
		const query = action ? { action } : {};
		const skip = (Number(page) - 1) * Number(limit);

		const [logs, total] = await Promise.all([
			AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
			AuditLog.countDocuments(query),
		]);

		res.status(200).json({ logs, total, page: Number(page) });
	} catch (error) {
		res.status(500).json({ message: "Failed to fetch audit logs." });
	}
};
