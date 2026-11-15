
import mongoose from 'mongoose';

import ProductTypeModel from '../models/productType.model';
import AttributeModel from '../models/attribute.model';
import OptionSetModel from '../models/optionSet.model';
import {AppError} from '../utils/AppError';

import type {
  CreateProductTypeInput,
  UpdateProductTypeInput,
  ProductTypeListQuery,
} from '../validators/productType.validation';

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
      'KEY_TAKEN',
      'A product type with this key already exists',
    );
  }

  throw error;
}

async function validateReferences(
  attributes: Array<{ attributeId: string }>,
  optionSets: Array<{ optionSetId: string }>,
) {
  const attributeIds = [
    ...new Set(attributes.map((item) => item.attributeId)),
  ];

  const optionSetIds = [
    ...new Set(optionSets.map((item) => item.optionSetId)),
  ];

  const [attributeCount, optionSetCount] = await Promise.all([
    AttributeModel.countDocuments({
      _id: { $in: attributeIds },
    }),
    OptionSetModel.countDocuments({
      _id: { $in: optionSetIds },
    }),
  ]);

  if (attributeCount !== attributeIds.length) {
    throw new AppError(
      400,
      'INVALID_ATTRIBUTE_REFERENCE',
      'One or more referenced attributes do not exist',
    );
  }

  if (optionSetCount !== optionSetIds.length) {
    throw new AppError(
      400,
      'INVALID_OPTION_SET_REFERENCE',
      'One or more referenced option sets do not exist',
    );
  }
}

export async function createProductType(
  input: CreateProductTypeInput,
) {
  await validateReferences(
    input.attributes,
    input.optionSetIds,
  );

  try {
    return await ProductTypeModel.create(input);
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function listProductTypes(
  query: ProductTypeListQuery,
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
    const regex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { name: regex },
      { key: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [productTypes, total] = await Promise.all([
    ProductTypeModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    ProductTypeModel.countDocuments(filter),
  ]);

  return {
    productTypes,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductTypeById(id: string) {
  const productType = await ProductTypeModel
    .findById(id)
    .lean();

  if (!productType) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Product type not found',
    );
  }

  return productType;
}

export async function updateProductType(
  id: string,
  input: UpdateProductTypeInput,
) {
  const productType = await ProductTypeModel.findById(id);

  if (!productType) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Product type not found',
    );
  }

  const nextAttributes =
    input.attributes ?? productType.attributes;

  const nextOptionSets =
    input.optionSetIds ?? productType.optionSetIds;

  await validateReferences(
    nextAttributes,
    nextOptionSets,
  );

  Object.assign(productType, input);

  try {
    await productType.save();
    return productType;
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function archiveProductType(id: string) {
  const productType = await ProductTypeModel.findById(id);

  if (!productType) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Product type not found',
    );
  }

  productType.status = 'archived';
  await productType.save();

  return productType;
}

export async function restoreProductType(id: string) {
  const productType = await ProductTypeModel.findById(id);

  if (!productType) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Product type not found',
    );
  }

  productType.status = 'active';
  await productType.save();

  return productType;
}
