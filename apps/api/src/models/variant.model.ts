
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

const variantOptionValueSchema = new Schema(
  {
    optionKey: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const variantMediaSchema = new Schema(
  {
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const stockSchema = new Schema(
  {
    onHand: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const variantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 40,
      match: /^[A-Z0-9_-]+$/,
    },
    barcode: {
      type: String,
      trim: true,
    },
    optionValues: {
      type: [variantOptionValueSchema],
      default: [],
    },
    optionHash: {
      type: String,
      required: true,
      default: '',
    },
    price: {
      type: Number,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    image: {
      type: variantMediaSchema,
    },
    stock: {
      type: stockSchema,
      required: true,
      default: () => ({
        onHand: 0,
        reserved: 0,
      }),
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
    },
    lowStockNotified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'variants',
  },
);

variantSchema.index({ sku: 1 }, { unique: true });

variantSchema.index(
  { productId: 1, optionHash: 1 },
  { unique: true },
);

variantSchema.index({ productId: 1, isActive: 1 });

variantSchema.index({
  isActive: 1,
  'stock.onHand': 1,
});

export type Variant = InferSchemaType<typeof variantSchema>;

const VariantModel =
  models.Variant || model('Variant', variantSchema);

export default VariantModel;

