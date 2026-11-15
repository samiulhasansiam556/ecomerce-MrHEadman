
import SizeChartModel from '../models/sizeChart.model';
import OptionSetModel from '../models/optionSet.model';
import {AppError} from '../utils/AppError';

import type {
  CreateSizeChartInput,
  UpdateSizeChartInput,
  SizeChartListQuery,
} from '../validators/sizeChart.validation';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ensures row values only use keys defined in chart columns.
 */
function validateColumnValues(
  columns: Array<{ key: string }>,
  rows: Array<{ values: Record<string, string | number> }>,
) {
  const allowedKeys = new Set(
    columns.map((column) => column.key),
  );

  for (const row of rows) {
    for (const key of Object.keys(row.values)) {
      if (!allowedKeys.has(key)) {
        throw new AppError(
          400,
          'INVALID_COLUMN_KEY',
          `Row contains an undefined column key: ${key}`,
        );
      }
    }
  }
}

/**
 * Matches chart row sizes against the "size" option set.
 * If the size option set has not been created yet, this check is skipped.
 */
async function validateSizeValues(
  rows: Array<{ size: string }>,
) {
  const sizeOptionSet = await OptionSetModel.findOne({
    key: 'size',
  }).lean();

  if (!sizeOptionSet) {
    return;
  }

  const allowedSizes = new Set(
    sizeOptionSet.values.map((item: { value: string }) =>
      item.value.trim().toLowerCase(),
    ),
  );

  const invalidSizes = rows
    .map((row) => row.size.trim())
    .filter(
      (size) => !allowedSizes.has(size.toLowerCase()),
    );

  if (invalidSizes.length > 0) {
    throw new AppError(
      400,
      'INVALID_SIZE_VALUE',
      `Unknown size value(s): ${invalidSizes.join(', ')}`,
    );
  }
}

export async function createSizeChart(
  input: CreateSizeChartInput,
) {
  validateColumnValues(input.columns, input.rows);
  await validateSizeValues(input.rows);

  return SizeChartModel.create(input);
}

export async function listSizeCharts(
  query: SizeChartListQuery,
) {
  const {
    page,
    limit,
    status,
    search,
  } = query;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.name = new RegExp(
      escapeRegex(search),
      'i',
    );
  }

  const skip = (page - 1) * limit;

  const [sizeCharts, total] = await Promise.all([
    SizeChartModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    SizeChartModel.countDocuments(filter),
  ]);

  return {
    sizeCharts,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSizeChartById(id: string) {
  const sizeChart = await SizeChartModel
    .findById(id)
    .lean();

  if (!sizeChart) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Size chart not found',
    );
  }

  return sizeChart;
}

export async function updateSizeChart(
  id: string,
  input: UpdateSizeChartInput,
) {
  const sizeChart = await SizeChartModel.findById(id);

  if (!sizeChart) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Size chart not found',
    );
  }

  const nextColumns = input.columns ?? sizeChart.columns;
  const nextRows = input.rows ?? sizeChart.rows;

  validateColumnValues(nextColumns, nextRows);
  await validateSizeValues(nextRows);

  Object.assign(sizeChart, input);

  await sizeChart.save();

  return sizeChart;
}

export async function archiveSizeChart(id: string) {
  const sizeChart = await SizeChartModel.findById(id);

  if (!sizeChart) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Size chart not found',
    );
  }

  sizeChart.status = 'archived';
  await sizeChart.save();

  return sizeChart;
}

export async function restoreSizeChart(id: string) {
  const sizeChart = await SizeChartModel.findById(id);

  if (!sizeChart) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Size chart not found',
    );
  }

  sizeChart.status = 'active';
  await sizeChart.save();

  return sizeChart;
}
