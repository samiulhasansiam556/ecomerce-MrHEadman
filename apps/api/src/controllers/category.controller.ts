import type { RequestHandler } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import type { AuthenticatedUser } from "../middlewares/auth";

import {
  createCategory,
  listCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  archiveCategory,
  restoreCategory,
  deleteCategory,
} from "../services/category.service";
import { moveCategory, reorderCategories } from "../services/category.service";

import type {
  MoveCategoryInput,
  ReorderCategoriesInput,
} from "../validators/category.validation";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../validators/category.validation";

type CategoryActor = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

function getActor(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): CategoryActor {
  const admin = res.locals.authUser as AuthenticatedUser;

  return {
    actorId: admin.id,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const createCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const input = res.locals.validated as CreateCategoryInput;

    const category = await createCategory(input, getActor(req, res));

    return res.status(201).json({
      success: true,
      data: { category },
    });
  },
);

export const listCategoriesController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const query = res.locals.validated as {
      page: number;
      limit: number;
      status?: string;
      search?: string;
      parentId?: string | null;
      level?: number;
    };

    const result = await listCategories(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const getCategoryTreeController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const tree = await getCategoryTree();

    return res.status(200).json({
      success: true,
      data: { categories: tree },
    });
  },
);

export const getCategoryByIdController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const { id } = res.locals.validated as { id: string };

    const category = await getCategoryById(id);

    return res.status(200).json({
      success: true,
      data: { category },
    });
  },
);

export const updateCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const id = req.params.id as string;
    const input = res.locals.validated as UpdateCategoryInput;

    const category = await updateCategory(id, input, getActor(req, res));

    return res.status(200).json({
      success: true,
      data: { category },
    });
  },
);

export const archiveCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const id = req.params.id as string;
    const { status } = res.locals.validated as {
      status: "hidden" | "archived";
    };

    const category = await archiveCategory(id, status, getActor(req, res));

    return res.status(200).json({
      success: true,
      data: { category },
    });
  },
);

export const restoreCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const id = req.params.id as string;

    const category = await restoreCategory(id, getActor(req, res));

    return res.status(200).json({
      success: true,
      data: { category },
    });
  },
);

export const deleteCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const id = req.params.id as string;

    const result = await deleteCategory(id, getActor(req, res));

    return res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const moveCategoryController: RequestHandler = asyncHandler(
  async (req, res) => {
    const id = req.params.id as string;
    const input = res.locals.validated as MoveCategoryInput;

    const category = await moveCategory(id, input, getActor(req, res));

    return res.status(200).json({
      success: true,
      data: { category },
    });
  },
);

export const reorderCategoriesController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const input = res.locals.validated as ReorderCategoriesInput;

    const categories = await reorderCategories(input, getActor(_req, res));

    return res.status(200).json({
      success: true,
      data: { categories },
    });
  },
);
