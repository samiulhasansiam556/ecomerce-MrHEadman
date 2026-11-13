
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

import {
  ACTIVE_STATUSES,
  AUDIENCES,
} from '../constants/enums';

const mediaSchema = new Schema(
  {
    publicId: {
      type: String,
      trim: true,
      required: true,
    },
    url: {
      type: String,
      trim: true,
      required: true,
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

const seoSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 70,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false },
);

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    slugHistory: {
      type: [String],
      default: [],
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    path: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },

    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: mediaSchema,
      default: undefined,
    },

    banner: {
      type: mediaSchema,
      default: undefined,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },

    seo: {
      type: seoSchema,
      default: undefined,
    },

    productTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductType',
      default: null,
    },

    sizeChartId: {
      type: Schema.Types.ObjectId,
      ref: 'SizeChart',
      default: null,
    },

    audience: {
      type: String,
      enum: AUDIENCES,
      default: undefined,
    },

    status: {
      type: String,
      enum: ACTIVE_STATUSES,
      default: 'active',
      required: true,
    },

    hasChildren: {
      type: Boolean,
      default: false,
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
    collection: 'categories',
  },
);

// Unique category slug
categorySchema.index(
  { slug: 1 },
  { unique: true },
);

// Sibling ordering
categorySchema.index({
  parentId: 1,
  order: 1,
});

// Descendant/category subtree lookup
categorySchema.index({ path: 1 });

// Admin category filtering
categorySchema.index({
  status: 1,
  level: 1,
});

// Old slug lookup and redirect
categorySchema.index({ slugHistory: 1 });

export type Category = InferSchemaType<
  typeof categorySchema
>;

const CategoryModel =
  models.Category ||
  model('Category', categorySchema);

export default CategoryModel;
