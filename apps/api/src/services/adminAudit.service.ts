
import { isDeepStrictEqual } from 'node:util';
import mongoose, { Types, type ClientSession } from 'mongoose';

import AdminAuditEventModel from '../models/adminAuditEvent.model';
import UserModel from '../models/user.model';
import { AppError } from '../utils/AppError';

type AuditSnapshot = Record<string, unknown>;

interface CreateAdminAuditInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
  ip?: string;
  userAgent?: string;
  session?: ClientSession;
}

const SENSITIVE_FIELD_PATTERN =
  /password|token|secret|authorization|cookie|api.?key|credential|private.?key/i;

/**
 * Recursively removes sensitive fields from audit snapshots.
 */
function sanitizeSnapshot(value: unknown): unknown {
  if (value instanceof Date || value instanceof Types.ObjectId) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnapshot(item));
  }

  if (value && typeof value === 'object') {
    const safeObject: AuditSnapshot = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        continue;
      }

      safeObject[key] = sanitizeSnapshot(nestedValue);
    }

    return safeObject;
  }

  return value;
}

/**
 * Keeps only fields whose values actually changed.
 */
function getChangedSnapshots(
  before?: AuditSnapshot,
  after?: AuditSnapshot,
): {
  before?: AuditSnapshot;
  after?: AuditSnapshot;
} {
  const safeBefore = (sanitizeSnapshot(before ?? {}) as AuditSnapshot);
  const safeAfter = (sanitizeSnapshot(after ?? {}) as AuditSnapshot);

  const changedBefore: AuditSnapshot = {};
  const changedAfter: AuditSnapshot = {};

  const allKeys = new Set([
    ...Object.keys(safeBefore),
    ...Object.keys(safeAfter),
  ]);

  for (const key of allKeys) {
    const beforeValue = safeBefore[key];
    const afterValue = safeAfter[key];

    if (isDeepStrictEqual(beforeValue, afterValue)) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(safeBefore, key)) {
      changedBefore[key] = beforeValue;
    }

    if (Object.prototype.hasOwnProperty.call(safeAfter, key)) {
      changedAfter[key] = afterValue;
    }
  }

  return {
    ...(Object.keys(changedBefore).length > 0
      ? { before: changedBefore }
      : {}),
    ...(Object.keys(changedAfter).length > 0
      ? { after: changedAfter }
      : {}),
  };
}

/**
 * Creates an append-only audit event for an active administrator.
 *
 * Pass the existing transaction session when the audited operation
 * is part of a MongoDB transaction.
 */
export async function createAdminAuditEvent(
  input: CreateAdminAuditInput,
) {
  if (!Types.ObjectId.isValid(input.actorId)) {
    throw new AppError(
      403,
      'ADMIN_REQUIRED',
      'Active administrator access is required',
    );
  }

  if (
    !input.action?.trim() ||
    !input.targetType?.trim()
  ) {
    throw new AppError(
      400,
      'INVALID_AUDIT_EVENT',
      'Audit action and target type are required',
    );
  }

  if (
    input.targetId &&
    !Types.ObjectId.isValid(input.targetId)
  ) {
    throw new AppError(
      400,
      'INVALID_AUDIT_TARGET',
      'Invalid audit target ID',
    );
  }

  const adminQuery = UserModel.findOne({
    _id: input.actorId,
    role: 'admin',
    status: 'active',
  }).select('_id');

  if (input.session) {
    adminQuery.session(input.session);
  }

  const activeAdmin = await adminQuery.lean();

  if (!activeAdmin) {
    throw new AppError(
      403,
      'ADMIN_REQUIRED',
      'Active administrator access is required',
    );
  }

  const changedSnapshots = getChangedSnapshots(
    input.before,
    input.after,
  );

  const auditData = {
    actorId: new Types.ObjectId(input.actorId),
    action: input.action.trim(),
    targetType: input.targetType.trim(),
    ...(input.targetId
      ? { targetId: new Types.ObjectId(input.targetId) }
      : {}),
    ...changedSnapshots,
    ...(input.ip ? { ip: input.ip } : {}),
    ...(input.userAgent
      ? { userAgent: input.userAgent }
      : {}),
  };

  let createdEvents;

  if (input.session) {
    createdEvents = await AdminAuditEventModel.create(
      [auditData],
      { session: input.session },
    );
  } else {
    createdEvents = await AdminAuditEventModel.create([
      auditData,
    ]);
  }

  return createdEvents[0];
}
