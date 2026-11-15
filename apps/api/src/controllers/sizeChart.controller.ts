
import type { Request, Response } from 'express';

import {asyncHandler} from '../utils/asyncHandler';

import {
  createSizeChart,
  listSizeCharts,
  getSizeChartById,
  updateSizeChart,
  archiveSizeChart,
  restoreSizeChart,
} from '../services/sizeChart.service';

export const createSizeChartController = asyncHandler(
  async (_req: Request, res: Response) => {
    const sizeChart = await createSizeChart(
      res.locals.validated,
    );

    res.status(201).json({
      success: true,
      data: sizeChart,
    });
  },
);

export const listSizeChartsController = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await listSizeCharts(
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: result.sizeCharts,
      meta: result.meta,
    });
  },
);

export const getSizeChartController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const sizeChart = await getSizeChartById(id);

    res.status(200).json({
      success: true,
      data: sizeChart,
    });
  },
);

export const updateSizeChartController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const sizeChart = await updateSizeChart(
      id,
      res.locals.validated,
    );

    res.status(200).json({
      success: true,
      data: sizeChart,
    });
  },
);

export const archiveSizeChartController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const sizeChart = await archiveSizeChart(id);

    res.status(200).json({
      success: true,
      data: sizeChart,
    });
  },
);

export const restoreSizeChartController = asyncHandler(
  async (_req: Request, res: Response) => {
    const { id } = res.locals.validated;

    const sizeChart = await restoreSizeChart(id);

    res.status(200).json({
      success: true,
      data: sizeChart,
    });
  },
);
