
import type { Request, Response } from 'express';

import {
  createProductType,
  listProductTypes,
  getProductTypeById,
  updateProductType,
  archiveProductType,
  restoreProductType,
} from '../services/productType.service';

import { asyncHandler } from '../utils/asyncHandler';

export const createProductTypeController = asyncHandler(
  async (_req: Request, res: Response) => {
    const productType = await createProductType(
      res.locals.validated,
    );

    res.status(201).json({
      success: true,
      data: productType,
    });
  },
);

export const listProductTypesController = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await listProductTypes(
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: result.productTypes,
      meta: result.meta,
    });
  },
);

export const getProductTypeController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const productType = await getProductTypeById(id);

    res.status(200).json({
      success: true,
      data: productType,
    });
  },
);

export const updateProductTypeController = asyncHandler(
  async (req: Request, res: Response) => {
    const productType = await updateProductType(
      req.params.id as string,
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: productType,
    });
  },
);

export const archiveProductTypeController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const productType = await archiveProductType(id);

    res.status(200).json({
      success: true,
      data: productType,
    });
  },
);

export const restoreProductTypeController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const productType = await restoreProductType(id);

    res.status(200).json({
      success: true,
      data: productType,
    });
  },
);
