import type { RequestHandler } from "express";


import type { AuthenticatedUser } from "../middlewares/auth";

import { createProduct } from "../services/product.service";
import type { CreateProductInput } from "../validators/product.validation";
import { getAdminProducts } from "../services/product.service";
import type { ProductListQuery } from "../validators/product.validation";



type ProductActor = {
  actorId: string;
  ip?: string;
  userAgent?: string;
};

const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

function getActor(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): ProductActor {
  const admin = res.locals.authUser as AuthenticatedUser;

  return {
    actorId: admin.id,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const createProductController: RequestHandler = asyncHandler(
  async (req, res) => {
    const input = res.locals.validated as CreateProductInput;

    const result = await createProduct(input, getActor(req, res));

    return res.status(201).json({
      success: true,
      data: result,
    });
  },
);


export const getAdminProductsController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = res.locals.validated as ProductListQuery;

    const result = await getAdminProducts(query);

    return res.status(200).json({
      success: true,
      data: result.products,
      meta: result.meta,
    });
  },
);