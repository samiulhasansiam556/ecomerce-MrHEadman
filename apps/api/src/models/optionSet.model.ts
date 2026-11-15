import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import {
  ACTIVE_STATUSES,
  OPTION_SET_TYPES,
} from '../constants/enums';

const optionValueSchema = new Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    colorHex: {
      type: String,
      trim: true,
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

const optionSetSchema = new Schema(
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
      match: /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
    },
    type: {
      type: String,
      enum: OPTION_SET_TYPES,
      required: true,
    },
    values: {
      type: [optionValueSchema],
      required: true,
      validate: {
        validator: (values: unknown[]) =>
          values.length > 0,
        message: 'At least one value is required',
      },
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'optionSets',
  },
);

optionSetSchema.index(
  { key: 1 },
  { unique: true },
);

export type OptionSet = InferSchemaType<
  typeof optionSetSchema
>;

const OptionSetModel =
  models.OptionSet ||
  model('OptionSet', optionSetSchema);

export default OptionSetModel;