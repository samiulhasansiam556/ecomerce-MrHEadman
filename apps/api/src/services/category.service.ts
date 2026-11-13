
import { Types } from 'mongoose';

import CategoryModel from '../models/category.model';
import { AppError } from '../utils/AppError';
import {
  createAdminAuditEvent,
} from './adminAudit.service';

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../validators/category.validation';

import type {
  MoveCategoryInput,
  ReorderCategoriesInput,
} from '../validators/category.validation';

type AuditActor = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

function generateSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureSlugAvailable(
  slug: string,
  excludeId?: string,
): Promise<void> {
  const query: Record<string, unknown> = {
    $or: [
      { slug },
      { slugHistory: slug },
    ],
  };

  if (excludeId) {
    query._id = { $ne: new Types.ObjectId(excludeId) };
  }

  const existing = await CategoryModel.exists(query);

  if (existing) {
    throw new AppError(
      409,
      'DUPLICATE_SLUG',
      'This category slug is already in use',
    );
  }
}

async function getParentCategory(parentId: string | null) {
  if (!parentId) return null;

  const parent = await CategoryModel.findById(parentId);

  if (!parent) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Parent category not found',
    );
  }

    if (parent.status !== 'active') {
    throw new AppError(
      409,
      'PARENT_CATEGORY_INACTIVE',
      'Cannot create or move a category under a hidden or archived parent',
    );
  }

  if (parent.level >= 3) {
    throw new AppError(
      400,
      'CATEGORY_DEPTH_EXCEEDED',
      'Maximum category depth is 3',
    );
  }

  if (parent.productCount > 0) {
    throw new AppError(
      409,
      'CATEGORY_HAS_PRODUCTS',
      'A category containing products cannot have child categories',
    );
  }

  return parent;
}

function createAuditContext(
  actor: AuditActor,
  action: string,
  targetId: string,
  after: Record<string, unknown>,
) {
  return createAdminAuditEvent({
    actorId: actor.actorId,
    action,
    targetType: 'category',
    targetId,
    after,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}


async function validateCategoryStatusChange(
  categoryId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  productCount: number,
  nextStatus: 'active' | 'hidden' | 'archived',
): Promise<void> {
  // A category can only be active if its parent is active.
  if (nextStatus === 'active' && parentId) {
    const parent = await CategoryModel.findById(parentId)
      .select('status')
      .lean();

    if (!parent || parent.status !== 'active') {
      throw new AppError(
        409,
        'PARENT_CATEGORY_INACTIVE',
        'Restore the parent category before restoring this category',
      );
    }
  }

  // Archived categories must not contain products.
  if (nextStatus === 'archived' && productCount > 0) {
    throw new AppError(
      409,
      'CATEGORY_HAS_PRODUCTS',
      'Move or archive products before archiving this category',
    );
  }

  // A hidden/archived category cannot contain active descendants.
  if (nextStatus !== 'active') {
    const activeDescendants = await CategoryModel.countDocuments({
      path: categoryId,
      status: 'active',
    });

    if (activeDescendants > 0) {
      throw new AppError(
        409,
        'CATEGORY_HAS_ACTIVE_CHILDREN',
        'Hide or archive active child categories before changing this category status',
      );
    }
  }
}

/**
 * Create category.
 */
export async function createCategory(
  input: CreateCategoryInput,
  actor: AuditActor,
) {
  const parent = await getParentCategory(
    input.parentId ?? null,
  );

  const level = parent ? parent.level + 1 : 1;

  if (level > 3) {
    throw new AppError(
      400,
      'CATEGORY_DEPTH_EXCEEDED',
      'Maximum category depth is 3',
    );
  }

  const slug = input.slug || generateSlug(input.name);

  if (!slug) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please provide a valid English slug for this category',
    );
  }

  await ensureSlugAvailable(slug);

  const category = await CategoryModel.create({
    ...input,
    slug,
    parentId: parent?._id ?? null,
    path: parent
      ? [...parent.path, parent._id]
      : [],
    level,
    hasChildren: false,
    productCount: 0,
  });

  if (parent) {
    parent.hasChildren = true;
    await parent.save();
  }

  await createAuditContext(
    actor,
    'category.create',
    category._id.toString(),
    category.toObject(),
  );

  return category;
}

/**
 * List categories with pagination and filters.
 */
export async function listCategories(query: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  parentId?: string | null;
  level?: number;
}) {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.level) {
    filter.level = query.level;
  }

  if (query.parentId !== undefined) {
    filter.parentId = query.parentId
      ? new Types.ObjectId(query.parentId)
      : null;
  }

  if (query.search) {
    filter.name = {
      $regex: query.search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      ),
      $options: 'i',
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    CategoryModel.find(filter)
      .sort({ parentId: 1, order: 1, name: 1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),

    CategoryModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

/**
 * Return complete category tree.
 * Includes active, hidden and archived categories.
 */
export async function getCategoryTree() {
  const categories = await CategoryModel.find()
    .sort({ order: 1, name: 1 })
    .lean();

  type TreeNode = (typeof categories)[number] & {
    children: TreeNode[];
  };

  const nodeMap = new Map<string, TreeNode>();

  for (const category of categories) {
    nodeMap.set(category._id.toString(), {
      ...category,
      children: [],
    });
  }

  const roots: TreeNode[] = [];

  for (const node of nodeMap.values()) {
    const parentId = node.parentId?.toString();

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Get category details.
 */
export async function getCategoryById(id: string) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

  const [parent, children] = await Promise.all([
    category.parentId
      ? CategoryModel.findById(category.parentId)
          .select('name slug level')
          .lean()
      : null,

    CategoryModel.find({ parentId: category._id })
      .select('name slug status order')
      .sort({ order: 1 })
      .lean(),
  ]);

  return {
    ...category.toObject(),
    parent,
    children,
  };
}

/**
 * Update category fields.
 * Parent changes must use the dedicated move operation.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
  actor: AuditActor,
) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

  if (input.parentId !== undefined) {
    throw new AppError(
      400,
      'USE_CATEGORY_MOVE',
      'Use the category move operation to change parent',
    );
  }

  const before = category.toObject();

  if (input.slug && input.slug !== category.slug) {
    await ensureSlugAvailable(input.slug, id);

    if (!category.slugHistory.includes(category.slug)) {
      category.slugHistory.push(category.slug);
    }

    category.slug = input.slug;
  }

  if (input.name !== undefined) {
    category.name = input.name;
  }

  if (input.image !== undefined) {
    category.image = input.image;
  }

  if (input.banner !== undefined) {
    category.banner = input.banner;
  }

  if (input.description !== undefined) {
    category.description = input.description;
  }

  if (input.seo !== undefined) {
    category.seo = input.seo;
  }

  if (input.productTypeId !== undefined) {
    category.productTypeId = input.productTypeId
      ? new Types.ObjectId(input.productTypeId)
      : null;
  }

  if (input.sizeChartId !== undefined) {
    category.sizeChartId = input.sizeChartId
      ? new Types.ObjectId(input.sizeChartId)
      : null;
  }

  if (input.audience !== undefined) {
    category.audience = input.audience;
  }

  if (input.order !== undefined) {
    category.order = input.order;
  }

     if (input.status !== undefined) {
    await validateCategoryStatusChange(
      category._id,
      category.parentId,
      category.productCount,
      input.status,
    );

    category.status = input.status;
  }

  await category.save();

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: 'category.update',
    targetType: 'category',
    targetId: id,
    before,
    after: category.toObject(),
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return category;
}

/**
 * Archive or hide a category.
 */
export async function archiveCategory(
  id: string,
  status: 'hidden' | 'archived',
  actor: AuditActor,
) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

   await validateCategoryStatusChange(
    category._id,
    category.parentId,
    category.productCount,
    status,
  );
  const before = category.toObject();

  category.status = status;
  await category.save();

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: `category.${status}`,
    targetType: 'category',
    targetId: id,
    before,
    after: category.toObject(),
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return category;
}

/**
 * Restore an archived/hidden category.
 */
export async function restoreCategory(
  id: string,
  actor: AuditActor,
) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

    await validateCategoryStatusChange(
    category._id,
    category.parentId,
    category.productCount,
    'active',
  );
  const before = category.toObject();

  category.status = 'active';
  await category.save();

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: 'category.restore',
    targetType: 'category',
    targetId: id,
    before,
    after: category.toObject(),
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return category;
}

/**
 * Permanently delete an unused category.
 */
export async function deleteCategory(
  id: string,
  actor: AuditActor,
) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

  const [childrenCount] = await Promise.all([
    CategoryModel.countDocuments({
      parentId: category._id,
    }),
  ]);

  if (childrenCount > 0 || category.productCount > 0) {
    throw new AppError(
      409,
      'ENTITY_IN_USE',
      'Category has child categories or products',
    );
  }

  const snapshot = category.toObject();
  const parentId = category.parentId;

  await category.deleteOne();

  if (parentId) {
    const remainingChildren =
      await CategoryModel.countDocuments({ parentId });

    if (remainingChildren === 0) {
      await CategoryModel.updateOne(
        { _id: parentId },
        { $set: { hasChildren: false } },
      );
    }
  }

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: 'category.delete',
    targetType: 'category',
    targetId: id,
    before: snapshot,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return { deleted: true };
}



export async function moveCategory(
  id: string,
  input: MoveCategoryInput,
  actor: AuditActor,
) {
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(
      404,
      'CATEGORY_NOT_FOUND',
      'Category not found',
    );
  }

  const newParent = await getParentCategory(input.parentId);

  // A category cannot become its own parent or move
  // under any of its descendants.
  if (newParent) {
    const isSelf = newParent._id.equals(category._id);
    const isDescendant = newParent.path.some(
      (ancestorId: Types.ObjectId) => ancestorId.equals(category._id),
    );

    if (isSelf || isDescendant) {
      throw new AppError(
        400,
        'INVALID_CATEGORY_MOVE',
        'A category cannot be moved under itself or its descendant',
      );
    }
  }

  const subtree = await CategoryModel.find({
    $or: [
      { _id: category._id },
      { path: category._id },
    ],
  });

  const newParentPath = newParent
    ? [...newParent.path, newParent._id]
    : [];

  const newRootLevel = newParentPath.length + 1;
  const maxCurrentLevel = Math.max(
    ...subtree.map((node) => node.level),
  );

  const levelDifference = newRootLevel - category.level;

  if (maxCurrentLevel + levelDifference > 3) {
    throw new AppError(
      400,
      'CATEGORY_DEPTH_EXCEEDED',
      'Moving this category would exceed the maximum depth of 3',
    );
  }

  const before = category.toObject();
  const oldParentId = category.parentId;

  // Update path and level for the category and all descendants.
  const operations = subtree.map((node) => {
    const isRoot = node._id.equals(category._id);

    let updatedPath: Types.ObjectId[];

    if (isRoot) {
      updatedPath = newParentPath;
    } else {
      const rootIndex = node.path.findIndex(
        (ancestorId: Types.ObjectId) => ancestorId.equals(category._id),
      );

      const descendantPath = node.path.slice(rootIndex + 1);

      updatedPath = [
        ...newParentPath,
        category._id,
        ...descendantPath,
      ];
    }

    const update: Record<string, unknown> = {
      path: updatedPath,
      level: updatedPath.length + 1,
    };

    if (isRoot) {
      update.parentId = newParent?._id ?? null;
      update.order = input.order;
    }

    return CategoryModel.updateOne(
      { _id: node._id },
      { $set: update },
    );
  });

  await Promise.all(operations);

  // Keep parent hasChildren flags consistent.
  if (oldParentId && !oldParentId.equals(newParent?._id ?? null)) {
    const remainingChildren = await CategoryModel.countDocuments({
      parentId: oldParentId,
    });

    if (remainingChildren === 0) {
      await CategoryModel.updateOne(
        { _id: oldParentId },
        { $set: { hasChildren: false } },
      );
    }
  }

  if (newParent) {
    await CategoryModel.updateOne(
      { _id: newParent._id },
      { $set: { hasChildren: true } },
    );
  }

  const updatedCategory = await CategoryModel.findById(id);

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: 'category.move',
    targetType: 'category',
    targetId: id,
    before,
    after: updatedCategory?.toObject(),
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return updatedCategory;
}

export async function reorderCategories(
  input: ReorderCategoriesInput,
  actor: AuditActor,
) {
  const parentId = input.parentId
    ? new Types.ObjectId(input.parentId)
    : null;

  const siblings = await CategoryModel.find({
    parentId,
  }).select('_id order');

  const existingIds = new Set(
    siblings.map((item) => item._id.toString()),
  );

  const requestedIds = new Set(input.orderedIds);

  // Every sibling must be included exactly once.
  if (
    existingIds.size !== requestedIds.size ||
    [...existingIds].some((id) => !requestedIds.has(id))
  ) {
    throw new AppError(
      400,
      'INVALID_CATEGORY_ORDER',
      'orderedIds must contain every sibling category exactly once',
    );
  }

  await CategoryModel.bulkWrite(
    input.orderedIds.map((categoryId, index) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(categoryId),
          parentId,
        },
        update: {
          $set: { order: index },
        },
      },
    })),
  );

  await createAdminAuditEvent({
    actorId: actor.actorId,
    action: 'category.reorder',
    targetType: 'category',
    before: {
      parentId: parentId?.toString() ?? null,
      previousOrder: siblings.map((item) => ({
        id: item._id.toString(),
        order: item.order,
      })),
    },
    after: {
      parentId: parentId?.toString() ?? null,
      orderedIds: input.orderedIds,
    },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return CategoryModel.find({ parentId })
    .sort({ order: 1, name: 1 })
    .lean();
}
