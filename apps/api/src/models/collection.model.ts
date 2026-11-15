
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import { ACTIVE_STATUSES } from '../constants/enums';

const collectionMediaSchema = new Schema(
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

const collectionSchema = new Schema(
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
    type: {
      type: String,
      enum: ['manual'],
      required: true,
      default: 'manual',
    },
    banner: {
      type: collectionMediaSchema,
      default: undefined,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 20000,
    },
    productIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
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
    collection: 'collections',
  },
);

collectionSchema.index(
  { slug: 1 },
  { unique: true },
);

collectionSchema.index({
  status: 1,
  startsAt: 1,
  endsAt: 1,
});

export type Collection = InferSchemaType<
  typeof collectionSchema
>;

const CollectionModel =
  models.Collection ||
  model('Collection', collectionSchema);

export default CollectionModel;
