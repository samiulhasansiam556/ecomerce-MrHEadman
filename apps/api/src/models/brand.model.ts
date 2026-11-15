
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import { ACTIVE_STATUSES } from '../constants/enums';

const brandMediaSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      min: 1,
    },
    height: {
      type: Number,
      min: 1,
    },
    alt: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false },
);

const brandSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 120,
    },
    logo: {
      type: brandMediaSchema,
      default: undefined,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      required: true,
      default: 'active',
    },
    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'brands',
  },
);

brandSchema.index(
  { slug: 1 },
  { unique: true },
);

brandSchema.index({ status: 1 });

export type Brand = InferSchemaType<
  typeof brandSchema
>;

const BrandModel =
  models.Brand ||
  model('Brand', brandSchema);

export default BrandModel;
