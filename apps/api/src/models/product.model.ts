
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

const mediaSchema = new Schema(
  {
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const productImageSchema = new Schema(
  {
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    alt: { type: String, trim: true, maxlength: 200 },
    order: { type: Number, required: true, min: 0 },
    isMain: { type: Boolean, required: true, default: false },
    optionValue: {
      optionKey: { type: String, required: true },
      value: { type: String, required: true },
    },
  },
  { _id: false },
);

const attributeValueSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const optionValuesUsedSchema = new Schema(
  {
    optionKey: { type: String, required: true },
    values: { type: [String], required: true },
  },
  { _id: false },
);

const productSchema = new Schema(
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
      maxlength: 160,
    },
    slugHistory: {
      type: [String],
      default: [],
    },
    productCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    categoryPath: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      required: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
    },
    productTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductType',
      required: true,
    },
    collectionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Collection',
      default: [],
    },
    attributeValues: {
      type: [attributeValueSchema],
      default: [],
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    regularPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    saleStartsAt: Date,
    saleEndsAt: Date,
    optionKeys: {
      type: [String],
      default: [],
    },
    optionValuesUsed: {
      type: [optionValuesUsedSchema],
      default: [],
    },
    sizeChartId: {
      type: Schema.Types.ObjectId,
      ref: 'SizeChart',
    },
    isFeatured: {
      type: Boolean,
      default: false,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
    },
    publishedAt: Date,
    minPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    inStock: {
      type: Boolean,
      default: false,
    },
    searchText: {
      type: String,
      default: '',
    },
    stats: {
      unitsSold: { type: Number, default: 0, min: 0 },
      viewCount: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'products',
  },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ slugHistory: 1 });

productSchema.index({
  status: 1,
  categoryPath: 1,
  createdAt: -1,
});

productSchema.index({
  status: 1,
  categoryPath: 1,
  minPrice: 1,
});

productSchema.index({ status: 1, brandId: 1 });
productSchema.index({ status: 1, collectionIds: 1 });
productSchema.index({ status: 1, isFeatured: 1 });

productSchema.index({
  status: 1,
  'attributeValues.key': 1,
  'attributeValues.value': 1,
});

productSchema.index({
  status: 1,
  'optionValuesUsed.optionKey': 1,
  'optionValuesUsed.values': 1,
});

productSchema.index(
  { searchText: 'text', name: 'text' },
  { weights: { name: 5, searchText: 1 } },
);

productSchema.index(
  { 'stats.unitsSold': -1 },
  { partialFilterExpression: { status: 'published' } },
);

export type Product = InferSchemaType<typeof productSchema>;

const ProductModel =
  models.Product || model('Product', productSchema);

export default ProductModel;
