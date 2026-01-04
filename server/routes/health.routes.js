import { Router } from 'express';

const router = Router();

/**
 * 健康检查接口
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export { router as healthRoutes };
