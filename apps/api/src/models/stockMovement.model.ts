
import {
  Schema,
  model,
  models,
  type InferSchemaType,
} from 'mongoose';

const STOCK_MOVEMENT_TYPES = [
  'initial',
  'adjustment',
  'reserve',
  'sale',
  'release',
  'cancel_restock',
  'return_restock',
] as const;

const stockMovementSchema = new Schema(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Variant',
      required: true,
      index: true,
    },
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
    },
    type: {
      type: String,
      enum: STOCK_MOVEMENT_TYPES,
      required: true,
    },
    delta: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Delta must be an integer',
      },
    },
    field: {
      type: String,
      enum: ['onHand', 'reserved'],
      required: true,
    },
    before: {
      type: Number,
      required: true,
      min: 0,
    },
    after: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    returnId: {
      type: Schema.Types.ObjectId,
      ref: 'ReturnRequest',
    },
    actor: {
      type: {
        type: String,
        enum: ['admin', 'system', 'customer'],
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'stockMovements',
  },
);

stockMovementSchema.index({
  variantId: 1,
  createdAt: -1,
});

stockMovementSchema.index({
  orderId: 1,
});

stockMovementSchema.index({
  type: 1,
  createdAt: -1,
});

// Prevent updates and deletion: movement records are append-only.
stockMovementSchema.pre('findOneAndUpdate', function () {
  throw new Error('Stock movements are immutable');
});

stockMovementSchema.pre('updateOne', function () {
  throw new Error('Stock movements are immutable');
});

stockMovementSchema.pre('updateMany', function () {
  throw new Error('Stock movements are immutable');
});

stockMovementSchema.pre('deleteOne', function () {
  throw new Error('Stock movements are immutable');
});

stockMovementSchema.pre('deleteMany', function () {
  throw new Error('Stock movements are immutable');
});

export type StockMovement = InferSchemaType<
  typeof stockMovementSchema
>;

const StockMovementModel =
  models.StockMovement ||
  model('StockMovement', stockMovementSchema);

export default StockMovementModel;
