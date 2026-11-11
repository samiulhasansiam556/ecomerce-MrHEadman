import UserModel from '../models/user.model';
import { AppError } from '../utils/AppError';

import { cloudinary, getCloudinaryConfig } from '../config/cloudinary';

import type { UpdateProfileInput } from '../validators/account.validation';

const PROFILE_FOLDER = 'e-comerce-Mr-Headman/profile';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function verifyProfileImage(userId: string, publicId: string) {
  getCloudinaryConfig();

  const expectedPublicIdPrefix =
  `e-comerce-Mr-Headman/profile/avatar_${userId}_`;

if (!publicId.startsWith(expectedPublicIdPrefix)) {
    throw new AppError(
      400,
      'INVALID_PROFILE_IMAGE',
      'Invalid profile image',
    );
  }

  let resource: any;

  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
    });
  } catch {
    throw new AppError(
      400,
      'INVALID_PROFILE_IMAGE',
      'Profile image was not found on Cloudinary',
    );
  }

  const belongsToExpectedFolder =
    resource.asset_folder === PROFILE_FOLDER ||
    resource.folder === PROFILE_FOLDER ||
    resource.public_id?.startsWith(`${PROFILE_FOLDER}/`);

  const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];

  if (
    resource.public_id !== publicId ||
    !belongsToExpectedFolder ||
    !resource.secure_url?.startsWith('https://') ||
    !allowedFormats.includes(resource.format) ||
    resource.bytes > MAX_IMAGE_SIZE
  ) {
    throw new AppError(
      400,
      'INVALID_PROFILE_IMAGE',
      'Profile image does not meet upload requirements',
    );
  }

  return {
    publicId: resource.public_id,
    url: resource.secure_url,
  };
}

export async function getMyProfile(userId: string) {
  const user = await UserModel.findById(userId).select(
    'name email phone role profileImage createdAt',
  );

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.profileImage ? { profileImage: user.profileImage } : {}),
    createdAt: user.createdAt,
  };
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const { profileImage, ...profileFields } = input;

  const updateData: Record<string, unknown> = {
    ...profileFields,
  };

  if (profileImage) {
    updateData.profileImage = await verifyProfileImage(
      userId,
      profileImage.publicId,
    );
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  ).select('name email phone role profileImage createdAt');

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.profileImage ? { profileImage: user.profileImage } : {}),
    createdAt: user.createdAt,
  };
}