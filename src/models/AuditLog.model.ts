import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
	actorId: mongoose.Types.ObjectId;
	actorRole: string;
	action: string;
	entityType: string;
	entityId?: string;
	details?: Record<string, unknown>;
	createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
	{
		actorId: { type: Schema.Types.ObjectId, required: true },
		actorRole: { type: String, required: true },
		action: { type: String, required: true, index: true },
		entityType: { type: String, required: true },
		entityId: { type: String, default: "" },
		details: { type: Schema.Types.Mixed, default: {} },
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
