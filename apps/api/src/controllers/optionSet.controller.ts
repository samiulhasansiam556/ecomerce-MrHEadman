import type { Request, RequestHandler, Response } from 'express';

import { asyncHandler } from '../utils/asyncHandler';

import type {
  CreateOptionSetInput,
  UpdateOptionSetInput,
  OptionSetListQuery,
} from '../validators/optionSet.validation';

import {
  createOptionSet,
  listOptionSets,
  getOptionSetById,
  updateOptionSet,
  archiveOptionSet,
  restoreOptionSet,
} from '../services/optionSet.service';

export const createOptionSetController: RequestHandler =
  asyncHandler(async (_req: Request, res: Response) => {
    const input = res.locals.validated as CreateOptionSetInput;

    const optionSet = await createOptionSet(input);

    res.status(201).json({
      success: true,
      data: { optionSet },
    });
  });

export const listOptionSetsController: RequestHandler =
  asyncHandler(async (_req: Request, res: Response) => {
    const query = res.locals.validated as OptionSetListQuery;

    const result = await listOptionSets(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

export const getOptionSetController: RequestHandler =
  asyncHandler(async (_req: Request, res: Response) => {
    const { id } = res.locals.validated as { id: string };

    const optionSet = await getOptionSetById(id);

    res.status(200).json({
      success: true,
      data: { optionSet },
    });
  });

export const updateOptionSetController: RequestHandler =
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const input = res.locals.validated as UpdateOptionSetInput;

    const optionSet = await updateOptionSet(id, input);

    res.status(200).json({
      success: true,
      data: { optionSet },
    });
  });

export const archiveOptionSetController: RequestHandler =
  asyncHandler(async (_req: Request, res: Response) => {
    const { id } = res.locals.validated as { id: string };

    const optionSet = await archiveOptionSet(id);

    res.status(200).json({
      success: true,
      data: { optionSet },
    });
  });

export const restoreOptionSetController: RequestHandler =
  asyncHandler(async (_req: Request, res: Response) => {
    const { id } = res.locals.validated as { id: string };

    const optionSet = await restoreOptionSet(id);

    res.status(200).json({
      success: true,
      data: { optionSet },
    });
  });