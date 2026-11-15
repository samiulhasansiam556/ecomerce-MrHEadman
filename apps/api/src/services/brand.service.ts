
import mongoose from 'mongoose';

import BrandModel from '../models/brand.model';
import {AppError} from '../utils/AppError';

import type {
  CreateBrandInput,
  UpdateBrandInput,
  BrandListQuery,
} from '../validators/brand.validation';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function handleDuplicateKey(error: unknown): never {
  if (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  ) {
    throw new AppError(
      409,
      'SLUG_TAKEN',
      'A brand with this slug already exists',
    );
  }

  throw error;
}

export async function createBrand(
  input: CreateBrandInput,
) {
  try {
    return await BrandModel.create(input);
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function listBrands(
  query: BrandListQuery,
) {
  const {
    page,
    limit,
    status,
    search,
  } = query;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(
      escapeRegex(search),
      'i',
    );

    filter.$or = [
      { name: regex },
      { slug: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [brands, total] = await Promise.all([
    BrandModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    BrandModel.countDocuments(filter),
  ]);

  return {
    brands,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getBrandById(id: string) {
  const brand = await BrandModel.findById(id).lean();

  if (!brand) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Brand not found',
    );
  }

  return brand;
}

export async function updateBrand(
  id: string,
  input: UpdateBrandInput,
) {
  const brand = await BrandModel.findById(id);

  if (!brand) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Brand not found',
    );
  }

  Object.assign(brand, input);

  try {
    await brand.save();
    return brand;
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function archiveBrand(id: string) {
  const brand = await BrandModel.findById(id);

  if (!brand) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Brand not found',
    );
  }

  brand.status = 'archived';
  await brand.save();

  return brand;
}

export async function restoreBrand(id: string) {
  const brand = await BrandModel.findById(id);

  if (!brand) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Brand not found',
    );
  }

  brand.status = 'active';
  await brand.save();

  return brand;
}
