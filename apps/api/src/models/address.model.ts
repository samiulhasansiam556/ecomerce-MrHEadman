import { model, Schema, Types } from 'mongoose';

export interface Address {
  userId: Types.ObjectId;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<Address>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^01[3-9]\d{8}$/,
    },
    division: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'addresses',
  },
);

addressSchema.index({ userId: 1 });

addressSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'uniq_default_address_per_user',
  },
);

const AddressModel = model<Address>('Address', addressSchema);

export default AddressModel;