import UserModel from '../models/user.model';
import { AppError } from '../utils/AppError';
import type { UpdateProfileInput } from '../validators/account.validation';

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
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: input },
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