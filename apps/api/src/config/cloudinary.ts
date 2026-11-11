import { v2 as cloudinary } from 'cloudinary';

import { env } from './env';
import { AppError } from '../utils/AppError';

export const getCloudinaryConfig = () => {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    throw new AppError(
      503,
      'CLOUDINARY_NOT_CONFIGURED',
      'Cloudinary is not configured',
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
  };
};

export { cloudinary };