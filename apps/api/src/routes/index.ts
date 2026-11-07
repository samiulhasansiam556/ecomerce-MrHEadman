import { Router } from 'express';
import { isDbReady } from '../config/db';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.get('/health/ready', (_req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'Database not connected' } });
  }
  return res.json({ success: true, data: { status: 'ready' } });
});

export default router;