import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * 通用速率限制配置
 */
export const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 默认15分钟
    max = 100, // 默认100次请求
    message = '请求过于频繁，请稍后再试',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator,
    handler,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` 头中
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 头
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler:
      handler ||
      ((req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          url: req.url,
          method: req.method,
        });
        res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }),
  });
};

/**
 * API通用速率限制
 * 限制每个IP在15分钟内最多100次请求
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100,
  message: 'API请求过于频繁，请稍后再试',
});

/**
 * 上传速率限制
 * 限制每个IP在1小时内最多上传20个文件
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20,
  message: '上传请求过于频繁，请1小时后再试',
});

/**
 * 分片上传速率限制
 * 限制每个IP在1分钟内最多上传60个分片
 */
export const chunkUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 60,
  message: '分片上传过于频繁，请稍后再试',
});

/**
 * 严格速率限制
 * 限制每个IP在1分钟内最多10次请求
 * 用于敏感操作（如删除、合并等）
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 10,
  message: '操作过于频繁，请稍后再试',
});

/**
 * 文件验证速率限制
 * 限制每个IP在5分钟内最多30次验证请求
 */
export const fileVerificationRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 30,
  message: '文件验证请求过于频繁，请稍后再试',
});

/**
 * 合并分片速率限制
 * 限制每个IP在10分钟内最多10次合并请求
 */
export const mergeChunksRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 10,
  message: '合并请求过于频繁，请稍后再试',
});

/**
 * 基于用户的速率限制
 * 如果用户已登录，使用用户ID作为key；否则使用IP
 */
export const userBasedRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 已登录用户可以请求更多次
  message: '请求过于频繁，请稍后再试',
  keyGenerator: (req) => {
    // 如果有用户信息，使用用户ID
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    // 否则使用IP
    return req.ip;
  },
});

/**
 * 自适应速率限制
 * 根据系统负载动态调整限制
 */
let adaptiveMax = 100;
let adaptiveWindowMs = 15 * 60 * 1000;

export const adaptiveRateLimiter = createRateLimiter({
  windowMs: adaptiveWindowMs,
  max: adaptiveMax,
  message: '系统负载较高，请稍后再试',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn('Adaptive rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      currentMax: adaptiveMax,
    });
    res.status(429).json({
      success: false,
      message: '系统负载较高，请稍后再试',
      retryAfter: Math.ceil(adaptiveWindowMs / 1000),
    });
  },
});

/**
 * 更新自适应速率限制参数
 */
export const updateAdaptiveRateLimit = (max, windowMs) => {
  adaptiveMax = max;
  adaptiveWindowMs = windowMs;
  logger.info('Adaptive rate limit updated', { max, windowMs });
};

/**
 * IP白名单检查中间件
 * 白名单中的IP不受速率限制
 */
export const ipWhitelistMiddleware = (req, res, next) => {
  const whitelist = process.env.IP_WHITELIST
    ? process.env.IP_WHITELIST.split(',').map((ip) => ip.trim())
    : [];

  if (whitelist.length > 0 && whitelist.includes(req.ip)) {
    logger.debug('IP in whitelist, skipping rate limit', { ip: req.ip });
    return next();
  }

  // 不在白名单中，继续应用速率限制
  next();
};

/**
 * 速率限制绕过中间件
 * 用于管理员或特殊用户绕过速率限制
 */
export const bypassRateLimitMiddleware = (req, res, next) => {
  // 如果用户是管理员，绕过速率限制
  if (req.user && req.user.role === 'admin') {
    logger.debug('Admin user, bypassing rate limit', { userId: req.user.id });
    return next();
  }

  // 否则继续应用速率限制
  next();
};

/**
 * 创建自定义速率限制器
 */
export const createCustomRateLimiter = (options) => {
  return createRateLimiter(options);
};

export default {
  apiRateLimiter,
  uploadRateLimiter,
  chunkUploadRateLimiter,
  strictRateLimiter,
  fileVerificationRateLimiter,
  mergeChunksRateLimiter,
  userBasedRateLimiter,
  adaptiveRateLimiter,
  ipWhitelistMiddleware,
  bypassRateLimitMiddleware,
  createCustomRateLimiter,
  updateAdaptiveRateLimit,
};
