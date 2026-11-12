
import { model, Schema, Types } from 'mongoose';

export interface AdminAuditEvent {
  actorId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditEventSchema = new Schema<AdminAuditEvent>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      immutable: true,
    },

    targetType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      immutable: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      immutable: true,
    },

    before: {
      type: Schema.Types.Mixed,
      immutable: true,
    },

    after: {
      type: Schema.Types.Mixed,
      immutable: true,
    },

    ip: {
      type: String,
      trim: true,
      maxlength: 64,
      immutable: true,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      immutable: true,
    },
  },
  {
    timestamps: true,
    collection: 'adminAuditEvents',
    versionKey: false,
  },
);

// Audit history indexes
adminAuditEventSchema.index(
  { createdAt: -1 },
  { name: 'idx_admin_audit_created_at' },
);

adminAuditEventSchema.index(
  { actorId: 1, createdAt: -1 },
  { name: 'idx_admin_audit_actor_created' },
);

adminAuditEventSchema.index(
  { targetType: 1, targetId: 1 },
  { name: 'idx_admin_audit_target' },
);

const AdminAuditEventModel = model<AdminAuditEvent>(
  'AdminAuditEvent',
  adminAuditEventSchema,
);

export default AdminAuditEventModel;
