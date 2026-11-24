import AuditLog from "../models/AuditLog.model";

export const logAudit = async ({
	actorId,
	actorRole,
	action,
	entityType,
	entityId = "",
	details = {},
}) => {
	try {
		await AuditLog.create({
			actorId,
			actorRole,
			action,
			entityType,
			entityId: String(entityId),
			details,
		});
	} catch (err) {
		console.error("audit log failed:", err.message);
	}
};
