import { randomUUID } from 'node:crypto';

import { AppError } from '../utils/AppError';
import { getCloudinaryConfig, cloudinary } from '../config/cloudinary';

import type { SignUploadInput } from '../validators/media.validation';

const MEDIA_ROOT_FOLDER = 'e-comerce-Mr-Headman';

const getFolderByPurpose = (purpose: SignUploadInput['purpose']) => {
  switch (purpose) {
    case 'avatar':
      return `${MEDIA_ROOT_FOLDER}/profile`;
  }
};

export const createUploadSignature = (userId: string, input: SignUploadInput) => {
  const { cloudName, apiKey, apiSecret, uploadPreset } =
    getCloudinaryConfig();

  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const folder = getFolderByPurpose(input.purpose);
  const timestamp = Math.floor(Date.now() / 1000);

  // Unique identifier; user cannot choose or overwrite another asset.
  const publicId = `avatar_${userId}_${randomUUID()}`;

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
    upload_preset: uploadPreset,
    overwrite: false,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret,
  );

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
    publicId,
    uploadPreset,
  };
};