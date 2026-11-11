import type { RequestHandler } from 'express';

import { createUploadSignature } from '../services/media.service';
import type { SignUploadInput } from '../validators/media.validation';

export const signUploadController: RequestHandler = (req, res, next) => {
  try {
    const authUser = res.locals.authUser;

    const input = res.locals.validated as SignUploadInput;

    const result = createUploadSignature(authUser.id, input);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      'MEDIA SIGNATURE ERROR:',
      error instanceof Error ? error.stack : error,
    );

    next(error);
  }
};