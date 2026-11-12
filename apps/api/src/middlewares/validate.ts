
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

export type ValidationSource = 'body' | 'query' | 'params';

const unsafeKeys = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

/**
 * Reject MongoDB operator keys and unsafe object keys.
 * Also rejects dot notation in user-provided object keys.
 */

function sanitizeInput(
  value: unknown,
  currentPath = '',
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeInput(item, `${currentPath}[${index}]`),
    );
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    const fieldPath = currentPath
      ? `${currentPath}.${key}`
      : key;

    if (
      key.startsWith('$') ||
      key.includes('.') ||
      unsafeKeys.has(key)
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Request contains an invalid field name',
        [
          {
            field: fieldPath,
            message: 'This field name is not allowed',
          },
        ],
      );
    }

    sanitized[key] = sanitizeInput(
      nestedValue,
      fieldPath,
    );
  }

  return sanitized;
}

/**
 * Validates request body, query, or route params using Zod.
 *
 * The parsed result is stored in:
 * res.locals.validated
 *
 * Individual Zod object schemas should use strictObject()
 * to reject unknown fields.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  source: ValidationSource = 'body',
): RequestHandler {
  return (req, res, next) => {
    try {
      let input: unknown;

      switch (source) {
        case 'body':
          input = req.body;
          break;

        case 'query':
          input = req.query;
          break;

        case 'params':
          input = req.params;
          break;
      }

      const sanitizedInput = sanitizeInput(input);
      const validatedData = schema.parse(sanitizedInput);

      res.locals.validated = validatedData;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
