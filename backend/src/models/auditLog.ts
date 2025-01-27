import { Schema, model } from 'mongoose';
import { AuditLog } from '../../../src/types/database.types';

const auditLogSchema = new Schema<AuditLog>(
  {
    eventType: { type: String, required: true },
    userId: { type: String },
    sessionId: { type: String },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String, enum: ['success', 'failure'], required: true },
    details: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
