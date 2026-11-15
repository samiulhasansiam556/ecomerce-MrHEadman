import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env';
import { isDbReady } from '../config/db';
import authRoutes from './auth.routes';
import meRoutes from './me.routes';
import mediaRoutes from './media.routes';
import adminEmailLogRoutes from './adminEmailLog.routes';
import adminCategoryRoutes from './adminCategory.routes';
import adminAttributeRoutes from './adminAttribute.routes';
import adminOptionSetRoutes from './adminOptionSet.routes';
import adminProductTypeRoutes from './adminProductType.routes';
import adminSizeChartRoutes from './adminSizeChart.routes';
import adminBrandRoutes from './adminBrand.routes';
import adminCollectionRoutes from './adminCollection.routes';
import {
  CSRF_COOKIE_NAME,
  csrfProtection,
} from '../middlewares/csrf';


const router = Router();

// Apply CSRF protection to API routes.
// Four auth endpoints are exempt inside the middleware.

router.use(csrfProtection);

// Liveness check
router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

// Readiness check
router.get('/health/ready', (_req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'NOT_READY',
        message: 'Database not connected',
      },
      requestId: res.locals.requestId,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      status: 'ready',
    },
  });
});

// Generate or reuse CSRF token
router.get('/auth/csrf', (req, res) => {
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];

  const csrfToken =
    typeof existingToken === 'string' &&
    /^[a-f0-9]{64}$/.test(existingToken)
      ? existingToken
      : randomBytes(32).toString('hex');

  if (csrfToken !== existingToken) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
});



router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminEmailLogRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/attributes', adminAttributeRoutes);
router.use('/admin/option-sets', adminOptionSetRoutes);
router.use('/admin/product-types', adminProductTypeRoutes);
router.use('/admin/size-charts', adminSizeChartRoutes);
router.use('/admin/brands', adminBrandRoutes);
router.use('/admin/collections', adminCollectionRoutes);



export default router;