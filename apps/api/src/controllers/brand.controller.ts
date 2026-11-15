
import type { Request, Response } from 'express';

import {asyncHandler} from '../utils/asyncHandler';

import {
  createBrand,
  listBrands,
  getBrandById,
  updateBrand,
  archiveBrand,
  restoreBrand,
} from '../services/brand.service';

export const createBrandController = asyncHandler(
  async (_req: Request, res: Response) => {
    const brand = await createBrand(
      res.locals.validated,
    );

    res.status(201).json({
      success: true,
      data: brand,
    });
  },
);

export const listBrandsController = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await listBrands(
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: result.brands,
      meta: result.meta,
    });
  },
);

export const getBrandController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const brand = await getBrandById(id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  },
);

export const updateBrandController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const brand = await updateBrand(
      id,
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: brand,
    });
  },
);

export const archiveBrandController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const brand = await archiveBrand(id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  },
);

export const restoreBrandController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const brand = await restoreBrand(id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  },
);
