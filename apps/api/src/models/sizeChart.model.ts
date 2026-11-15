
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import { ACTIVE_STATUSES } from '../constants/enums';

const sizeChartColumnSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const sizeChartRowSchema = new Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    values: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const sizeChartSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      enum: ['inch', 'cm', 'none'],
      required: true,
    },
    columns: {
      type: [sizeChartColumnSchema],
      required: true,
      default: [],
    },
    rows: {
      type: [sizeChartRowSchema],
      required: true,
      default: [],
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      required: true,
      default: 'active',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'sizeCharts',
  },
);

sizeChartSchema.index({ name: 1 });
sizeChartSchema.index({ status: 1 });

export type SizeChart = InferSchemaType<
  typeof sizeChartSchema
>;

const SizeChartModel =
  models.SizeChart ||
  model('SizeChart', sizeChartSchema);

export default SizeChartModel;
