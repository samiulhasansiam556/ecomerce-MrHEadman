
import { model, Schema } from 'mongoose';
import { ROLES, USER_STATUSES, type Role, type UserStatus } from '../constants/enums';

interface ProfileImage {
  publicId: string;
  url: string;
}

export interface User {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  profileImage?: ProfileImage;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const profileImageSchema = new Schema<ProfileImage>(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^01[3-9]\d{8}$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'customer',
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
      required: true,
    },
    profileImage: {
      type: profileImageSchema,
      default: undefined,
    },
    emailVerifiedAt: Date,
    lastLoginAt: Date,
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    
toJSON: {
  transform(_doc, ret) {
    const safeUser = ret as Record<string, unknown>;

    delete safeUser.passwordHash;
    delete safeUser.__v;

    return safeUser;
  },
},

  },
);

userSchema.index({ email: 1 }, { unique: true, name: 'uniq_users_email' });
userSchema.index({ phone: 1 }, { name: 'idx_users_phone' });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ name: 1 });

const UserModel = model<User>('User', userSchema);

export default UserModel;
