
import type { RequestHandler } from 'express';

import { asyncHandler } from '../utils/asyncHandler';

import {
  createAttribute,
  listAttributes,
  getAttributeById,
  updateAttribute,
  archiveAttribute,
  restoreAttribute,
} from '../services/attribute.service';

import type {
  CreateAttributeInput,
  UpdateAttributeInput,
  AttributeListQuery,
} from '../validators/attribute.validation';

export const createAttributeController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const input = res.locals.validated as CreateAttributeInput;

    const attribute = await createAttribute(input);

    return res.status(201).json({
      success: true,
      data: { attribute },
    });
  });

export const listAttributesController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const query = res.locals.validated as AttributeListQuery;

    const result = await listAttributes(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  });

export const getAttributeByIdController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.validated as { id: string };

    const attribute = await getAttributeById(id);

    return res.status(200).json({
      success: true,
      data: { attribute },
    });
  });

export const updateAttributeController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.validatedParams as { id: string };
    const input = res.locals.validated as UpdateAttributeInput;

    const attribute = await updateAttribute(id, input);

    return res.status(200).json({
      success: true,
      data: { attribute },
    });
  });

export const archiveAttributeController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.validated as { id: string };

    const attribute = await archiveAttribute(id);

    return res.status(200).json({
      success: true,
      data: { attribute },
    });
  });

export const restoreAttributeController: RequestHandler =
  asyncHandler(async (_req, res) => {
    const { id } = res.locals.validated as { id: string };

    const attribute = await restoreAttribute(id);

    return res.status(200).json({
      success: true,
      data: { attribute },
    });
  });
