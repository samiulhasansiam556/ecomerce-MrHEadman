
import type { Request, Response } from 'express';

import {
  createCollection,
  listCollections,
  getCollectionById,
  updateCollection,
  archiveCollection,
  restoreCollection,
} from '../services/collection.service';

import {asyncHandler} from '../utils/asyncHandler';

export const createCollectionController = asyncHandler(
  async (req: Request, res: Response) => {
    const collection = await createCollection(
      res.locals.validated,
    );

    res.status(201).json({
      success: true,
      data: collection,
    });
  },
);

export const listCollectionsController = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await listCollections(
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: result.collections,
      meta: result.meta,
    });
  },
);

export const getCollectionController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const collection = await getCollectionById(id);

    res.status(200).json({
      success: true,
      data: collection,
    });
  },
);

export const updateCollectionController = asyncHandler(
  async (req: Request, res: Response) => {
    const collection = await updateCollection(
      req.params.id as string,
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: collection,
    });
  },
);

export const archiveCollectionController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const collection = await archiveCollection(id);

    res.status(200).json({
      success: true,
      data: collection,
    });
  },
);

export const restoreCollectionController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const collection = await restoreCollection(id);

    res.status(200).json({
      success: true,
      data: collection,
    });
  },
);
