
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import {
  ACTIVE_STATUSES,
  ATTRIBUTE_INPUT_TYPES,
} from '../constants/enums';

const attributeOptionSchema = new Schema(
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

const attributeSchema = new Schema(
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
    inputType: {
      type: String,
      enum: ATTRIBUTE_INPUT_TYPES,
      required: true,
    },
    options: {
      type: [attributeOptionSchema],
      default: undefined,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    isFilterable: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'attributes',
  },
);

attributeSchema.index({ key: 1 }, { unique: true });
attributeSchema.index({ status: 1 });

export type Attribute = InferSchemaType<typeof attributeSchema>;

const AttributeModel =
  models.Attribute || model('Attribute', attributeSchema);

export default AttributeModel;
