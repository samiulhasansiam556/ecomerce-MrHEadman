
import mongoose, { Types } from 'mongoose';

import ProductModel from '../models/product.model';
import VariantModel from '../models/variant.model';
import StockMovementModel from '../models/stockMovement.model';

import CategoryModel from '../models/category.model';
import ProductTypeModel from '../models/productType.model';
import AttributeModel from '../models/attribute.model';
import OptionSetModel from '../models/optionSet.model';
import BrandModel from '../models/brand.model';
import CollectionModel from '../models/collection.model';
import SizeChartModel from '../models/sizeChart.model';

import { AppError } from '../utils/AppError';
import { createAdminAuditEvent } from './adminAudit.service';

import type {
  CreateProductInput,
  VariantInput,
} from '../validators/product.validation';

type AuditActor = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

function fail(code: string, message: string, status = 400): never {
  throw new AppError(status, code, message);
}

function makeOptionHash(
  optionValues: Array<{ optionKey: string; value: string }>,
): string {
  return [...optionValues]
    .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
    .map(({ optionKey, value }) => `${optionKey}=${value}`)
    .join('|');
}

function getEffectivePrices(
  variant: VariantInput,
  product: CreateProductInput,
) {
  const regularPrice = variant.price ?? product.regularPrice;
  const salePrice = variant.salePrice ?? product.salePrice;

  if (salePrice !== undefined && salePrice >= regularPrice) {
    fail(
      'INVALID_SALE_PRICE',
      'Sale price must be lower than the effective regular price',
    );
  }

  return { regularPrice, salePrice };
}

async function resolveCategoryConfiguration(
  category: {
    _id: Types.ObjectId;
    path: Types.ObjectId[];
    productTypeId?: Types.ObjectId | null;
    sizeChartId?: Types.ObjectId | null;
  },
  session: mongoose.ClientSession,
) {
  let productTypeId = category.productTypeId ?? null;
  let sizeChartId = category.sizeChartId ?? null;

  const ancestorIds = [...category.path].reverse();

  if (ancestorIds.length && (!productTypeId || !sizeChartId)) {
    const ancestors = await CategoryModel.find({
      _id: { $in: ancestorIds },
    })
      .select('_id productTypeId sizeChartId')
      .session(session)
      .lean();

    const ancestorMap = new Map(
      ancestors.map((item) => [item._id.toString(), item]),
    );

    for (const ancestorId of ancestorIds) {
      const ancestor = ancestorMap.get(ancestorId.toString());

      if (!ancestor) continue;

      if (!productTypeId && ancestor.productTypeId) {
        productTypeId = ancestor.productTypeId;
      }

      if (!sizeChartId && ancestor.sizeChartId) {
        sizeChartId = ancestor.sizeChartId;
      }

      if (productTypeId && sizeChartId) break;
    }
  }

  return { productTypeId, sizeChartId };
}

async function validateAttributes(
  input: CreateProductInput,
  productType: {
    attributes: Array<{
      attributeId: Types.ObjectId;
      required: boolean;
    }>;
  },
  session: mongoose.ClientSession,
) {
  const attributeIds = productType.attributes.map(
    (item) => item.attributeId,
  );

  const attributes = await AttributeModel.find({
    _id: { $in: attributeIds },
    status: 'active',
  })
    .session(session)
    .lean();

  if (attributes.length !== attributeIds.length) {
    fail(
      'INVALID_PRODUCT_TYPE_ATTRIBUTE',
      'Product type contains missing or inactive attributes',
      409,
    );
  }

  const attributeMap = new Map(
    attributes.map((item) => [item._id.toString(), item]),
  );

  const allowedKeys = new Set(
    attributes.map((item) => item.key),
  );

  const submittedKeys = input.attributeValues.map(
    (item) => item.key,
  );

  if (new Set(submittedKeys).size !== submittedKeys.length) {
    fail('DUPLICATE_ATTRIBUTE', 'Duplicate attribute keys are not allowed');
  }

  for (const key of submittedKeys) {
    if (!allowedKeys.has(key)) {
      fail(
        'UNKNOWN_ATTRIBUTE',
        `Attribute "${key}" is not allowed for this product type`,
      );
    }
  }

  for (const config of productType.attributes) {
    const attribute = attributeMap.get(config.attributeId.toString());

    if (!attribute) continue;

    const submitted = input.attributeValues.find(
      (item) => item.key === attribute.key,
    );

    if (config.required && !submitted) {
      fail(
        'REQUIRED_ATTRIBUTE_MISSING',
        `Required attribute "${attribute.key}" is missing`,
      );
    }

    if (submitted && attribute.inputType === 'select') {
      const allowed = new Set(
        (attribute.options ?? [])
          .filter((option: { hidden?: boolean; value: string }) => !option.hidden)
          .map((option: { value: string }) => option.value),
      );

      if (
        typeof submitted.value !== 'string' ||
        !allowed.has(submitted.value)
      ) {
        fail(
          'INVALID_ATTRIBUTE_VALUE',
          `Invalid value for attribute "${attribute.key}"`,
        );
      }
    }

    if (submitted && attribute.inputType === 'multiselect') {
      const allowed = new Set(
        (attribute.options ?? [])
          .filter((option: { hidden?: boolean; value: string }) => !option.hidden)
          .map((option: { value: string }) => option.value),
      );

      if (
        !Array.isArray(submitted.value) ||
        submitted.value.some((value) => !allowed.has(value))
      ) {
        fail(
          'INVALID_ATTRIBUTE_VALUE',
          `Invalid value for attribute "${attribute.key}"`,
        );
      }
    }

    if (
      submitted &&
      attribute.inputType === 'number' &&
      (typeof submitted.value !== 'number' ||
        !Number.isFinite(submitted.value))
    ) {
      fail(
        'INVALID_ATTRIBUTE_VALUE',
        `Attribute "${attribute.key}" must be a number`,
      );
    }

    if (
      submitted &&
      attribute.inputType === 'boolean' &&
      typeof submitted.value !== 'boolean'
    ) {
      fail(
        'INVALID_ATTRIBUTE_VALUE',
        `Attribute "${attribute.key}" must be boolean`,
      );
    }
  }
}

async function validateOptionsAndVariants(
  input: CreateProductInput,
  productType: {
    optionSetIds: Array<{
      optionSetId: Types.ObjectId;
      order: number;
    }>;
  },
  session: mongoose.ClientSession,
) {
  const configs = [...productType.optionSetIds].sort(
    (a, b) => a.order - b.order,
  );

  const optionSetIds = configs.map((item) => item.optionSetId);

  const optionSets = await OptionSetModel.find({
    _id: { $in: optionSetIds },
    status: 'active',
  })
    .session(session)
    .lean();

  if (optionSets.length !== optionSetIds.length) {
    fail(
      'INVALID_PRODUCT_TYPE_OPTION_SET',
      'Product type contains missing or inactive option sets',
      409,
    );
  }

  const optionSetMap = new Map(
    optionSets.map((item) => [item._id.toString(), item]),
  );

  const orderedOptionSets = configs.map(
    (config) => optionSetMap.get(config.optionSetId.toString())!,
  );

  const optionKeys = orderedOptionSets.map((item) => item.key);

  if (
    input.optionKeys.length !== optionKeys.length ||
    input.optionKeys.some((key, index) => key !== optionKeys[index])
  ) {
    fail(
      'OPTION_KEYS_MISMATCH',
      'optionKeys must match the product type option sets and their order',
    );
  }

  const allowedValues = new Map(
    orderedOptionSets.map((optionSet) => [
      optionSet.key,
      new Set(
        optionSet.values
          .filter((value:any) => !value.hidden)
          .map((value: { value: string }) => value.value),
      ),
    ]),
  );

  const hashes = new Set<string>();

  for (const variant of input.variants) {
    const values = variant.optionValues;

    if (optionKeys.length === 0) {
      if (input.variants.length !== 1 || values.length !== 0) {
        fail(
          'DEFAULT_VARIANT_REQUIRED',
          'Products without option sets must have exactly one default variant',
        );
      }
    } else {
      if (
        values.length !== optionKeys.length ||
        optionKeys.some(
          (key) => !values.some((item) => item.optionKey === key),
        )
      ) {
        fail(
          'VARIANT_OPTIONS_INCOMPLETE',
          'Every variant must contain exactly one value for each product option',
        );
      }
    }

    if (new Set(values.map((item) => item.optionKey)).size !== values.length) {
      fail(
        'DUPLICATE_VARIANT_OPTION',
        'A variant cannot contain duplicate option keys',
      );
    }

    for (const item of values) {
      const allowed = allowedValues.get(item.optionKey);

      if (!allowed || !allowed.has(item.value)) {
        fail(
          'INVALID_VARIANT_OPTION',
          `Invalid value "${item.value}" for option "${item.optionKey}"`,
        );
      }
    }

    const hash = makeOptionHash(values);

    if (hashes.has(hash)) {
      fail(
        'DUPLICATE_VARIANT_COMBINATION',
        'Duplicate variant option combinations are not allowed',
      );
    }

    hashes.add(hash);
    getEffectivePrices(variant, input);
  }

  const optionValuesUsed = optionKeys.map((optionKey) => ({
    optionKey,
    values: [
      ...new Set(
        input.variants.flatMap((variant) =>
          variant.optionValues
            .filter((item) => item.optionKey === optionKey)
            .map((item) => item.value),
        ),
      ),
    ],
  }));

  return { optionKeys, optionValuesUsed };
}

async function validateReferences(
  input: CreateProductInput,
  session: mongoose.ClientSession,
) {
  if (input.brandId) {
    const brand = await BrandModel.findOne({
      _id: input.brandId,
      status: 'active',
    }).session(session).lean();

    if (!brand) {
      fail('BRAND_NOT_FOUND', 'Brand does not exist or is inactive', 404);
    }
  }

  const collectionIds = [...new Set(input.collectionIds)];

  if (collectionIds.length !== input.collectionIds.length) {
    fail('DUPLICATE_COLLECTION', 'Duplicate collection IDs are not allowed');
  }

  if (collectionIds.length) {
    const count = await CollectionModel.countDocuments({
      _id: { $in: collectionIds },
      status: 'active',
    }).session(session);

    if (count !== collectionIds.length) {
      fail(
        'INVALID_COLLECTION',
        'One or more collections do not exist or are inactive',
      );
    }
  }
}

export async function createProduct(
  input: CreateProductInput,
  actor: AuditActor,
) {
  const session = await mongoose.startSession();

  let result: {
    product: unknown;
    variants: unknown[];
  } | undefined;

  try {
    await session.withTransaction(async () => {
      const category = await CategoryModel.findOne({
        _id: input.categoryId,
        status: 'active',
      }).session(session);

      if (!category) {
        fail(
          'CATEGORY_NOT_FOUND',
          'Category does not exist or is inactive',
          404,
        );
      }

      const hasChildren = await CategoryModel.exists({
        parentId: category._id,
      }).session(session);

      if (category.hasChildren || hasChildren) {
        fail(
          'CATEGORY_NOT_LEAF',
          'Products can only be assigned to leaf categories',
        );
      }

      const resolved = await resolveCategoryConfiguration(
        category,
        session,
      );

      if (!resolved.productTypeId) {
        fail(
          'PRODUCT_TYPE_NOT_CONFIGURED',
          'No product type is configured for this category or its ancestors',
          409,
        );
      }

      if (
        input.productTypeId !== resolved.productTypeId.toString()
      ) {
        fail(
          'PRODUCT_TYPE_MISMATCH',
          'Submitted product type does not match the category configuration',
        );
      }

      const productType = await ProductTypeModel.findOne({
        _id: resolved.productTypeId,
        status: 'active',
      }).session(session).lean();

      if (!productType) {
        fail(
          'PRODUCT_TYPE_INACTIVE',
          'Configured product type does not exist or is inactive',
          409,
        );
      }

      await validateAttributes(input, productType, session);

      const { optionKeys, optionValuesUsed } =
        await validateOptionsAndVariants(input, productType, session);

      await validateReferences(input, session);

      let sizeChartId: Types.ObjectId | undefined;

      if (productType.sizeChartEnabled) {
        const requestedSizeChartId =
          input.sizeChartId
            ? new Types.ObjectId(input.sizeChartId)
            : resolved.sizeChartId;

        if (requestedSizeChartId) {
          const sizeChart = await SizeChartModel.findOne({
            _id: requestedSizeChartId,
            status: 'active',
          }).session(session).lean();

          if (!sizeChart) {
            fail(
              'SIZE_CHART_NOT_FOUND',
              'Size chart does not exist or is inactive',
              404,
            );
          }

          sizeChartId = requestedSizeChartId;
        }
      }

      const activeVariants = input.variants.filter(
        (variant) => variant.isActive,
      );

      if (input.status === 'published') {
        if (input.images.length === 0) {
          fail(
            'PUBLISH_IMAGE_REQUIRED',
            'At least one product image is required before publishing',
          );
        }

        if (activeVariants.length === 0) {
          fail(
            'PUBLISH_VARIANT_REQUIRED',
            'At least one active variant is required before publishing',
          );
        }

        for (const variant of activeVariants) {
          const { regularPrice } = getEffectivePrices(variant, input);

          if (regularPrice <= 0) {
            fail(
              'PUBLISH_PRICE_REQUIRED',
              'Every active variant must have an effective price greater than zero',
            );
          }
        }
      }

      if (
        input.salePrice !== undefined &&
        input.salePrice >= input.regularPrice
      ) {
        fail(
          'INVALID_SALE_PRICE',
          'Product sale price must be lower than regular price',
        );
      }

      const productId = new Types.ObjectId();

      const variantPrices = input.variants.map((variant) =>
        getEffectivePrices(variant, input),
      );

      const minPrice = Math.min(
        ...variantPrices.map((item) => item.salePrice ?? item.regularPrice),
      );

      const maxPrice = Math.max(
        ...variantPrices.map((item) => item.salePrice ?? item.regularPrice),
      );

      const inStock = activeVariants.some(
        (variant) => variant.stock.onHand > 0,
      );

      const searchText = [
        input.name,
        input.productCode ?? '',
        input.description,
        ...input.tags,
        ...input.attributeValues.map((item) =>
          Array.isArray(item.value)
            ? item.value.join(' ')
            : String(item.value),
        ),
      ].join(' ').toLowerCase();

      const productData = {
        _id: productId,
        name: input.name,
        slug: input.slug,
        productCode: input.productCode,
        description: input.description,
        categoryId: category._id,
        categoryPath: [...category.path, category._id],
        brandId: input.brandId
          ? new Types.ObjectId(input.brandId)
          : undefined,
        productTypeId: resolved.productTypeId,
        collectionIds: input.collectionIds.map(
          (id) => new Types.ObjectId(id),
        ),
        attributeValues: input.attributeValues,
        images: input.images,
        regularPrice: input.regularPrice,
        salePrice: input.salePrice,
        saleStartsAt: input.saleStartsAt,
        saleEndsAt: input.saleEndsAt,
        optionKeys,
        optionValuesUsed,
        sizeChartId,
        isFeatured: input.isFeatured,
        tags: input.tags,
        seo: input.seo,
        status: input.status,
        publishedAt:
          input.status === 'published' ? new Date() : undefined,
        minPrice,
        maxPrice,
        inStock,
        searchText,
        stats: {
          unitsSold: 0,
          viewCount: 0,
        },
      };

      const [createdProduct] = await ProductModel.create(
        [productData],
        { session },
      );

      const variantDocuments = input.variants.map((variant) => ({
        productId,
        sku: variant.sku,
        barcode: variant.barcode,
        optionValues: variant.optionValues,
        optionHash: makeOptionHash(variant.optionValues),
        price: variant.price,
        salePrice: variant.salePrice,
        image: variant.image,
        stock: {
          onHand: variant.stock.onHand,
          reserved: 0,
        },
        lowStockThreshold: variant.lowStockThreshold,
        lowStockNotified: false,
        isActive: variant.isActive,
      }));

      const createdVariants = await VariantModel.create(
        variantDocuments,
        { session },
      );

      const movements = createdVariants
        .filter((variant) => variant.stock.onHand > 0)
        .map((variant) => ({
          variantId: variant._id,
          productId,
          sku: variant.sku,
          type: 'initial' as const,
          delta: variant.stock.onHand,
          field: 'onHand' as const,
          before: 0,
          after: variant.stock.onHand,
          reason: 'initial_stock',
          actor: {
            type: 'admin' as const,
            userId: new Types.ObjectId(actor.actorId),
          },
        }));

      if (movements.length) {
        await StockMovementModel.create(movements, { session });
      }

      await CategoryModel.updateOne(
        { _id: category._id },
        { $inc: { productCount: 1 } },
        { session },
      );

      if (input.brandId) {
        await BrandModel.updateOne(
          { _id: input.brandId },
          { $inc: { productCount: 1 } },
          { session },
        );
      }

      if (input.collectionIds.length) {
        await CollectionModel.updateMany(
          { _id: { $in: input.collectionIds } },
          { $addToSet: { productIds: productId } },
          { session },
        );
      }

      await createAdminAuditEvent({
        actorId: actor.actorId,
        action: 'product.create',
        targetType: 'product',
        targetId: productId.toString(),
        after: productData,
        ip: actor.ip,
        userAgent: actor.userAgent,
        session,
      });

      result = {
        product: createdProduct.toObject(),
        variants: createdVariants.map((variant) => variant.toObject()),
      };
    });

    if (!result) {
      throw new AppError(
        500,
        'PRODUCT_CREATE_FAILED',
        'Product creation did not complete',
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new AppError(
        409,
        'DUPLICATE_PRODUCT_DATA',
        'Product slug, SKU or variant combination already exists',
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
