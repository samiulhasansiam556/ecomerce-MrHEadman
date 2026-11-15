import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import { ACTIVE_STATUSES } from '../constants/enums';

const productTypeAttributeSchema = new Schema(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: 'Attribute',
      required: true,
    },
    required: {
      type: Boolean,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const productTypeOptionSetSchema = new Schema(
  {
    optionSetId: {
      type: Schema.Types.ObjectId,
      ref: 'OptionSet',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const productTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    },
    attributes: {
      type: [productTypeAttributeSchema],
      default: [],
    },
    optionSetIds: {
      type: [productTypeOptionSetSchema],
      default: [],
    },
    sizeChartEnabled: {
      type: Boolean,
      required: true,
      default: false,
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
    collection: 'productTypes',
  },
);

productTypeSchema.index(
  { key: 1 },
  { unique: true },
);

productTypeSchema.index({ status: 1 });

export type ProductType = InferSchemaType<
  typeof productTypeSchema
>;

const ProductTypeModel =
  models.ProductType ||
  model('ProductType', productTypeSchema);

export default ProductTypeModel;