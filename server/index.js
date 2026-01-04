import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import helmet from 'helmet';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { fileValidator, chunkValidator } from './middleware/fileValidator.js';
import {
  apiRateLimiter,
  uploadRateLimiter,
  chunkUploadRateLimiter,
  mergeChunksRateLimiter,
} from './middleware/rateLimiter.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { UploadRecordService } from './services/uploadRecordService.js';
import config, { validateConfig } from './config/index.js';

dotenv.config();

// 验证配置
validateConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = config.server.port;

// 初始化Redis服务
let uploadRecordService;
try {
  uploadRecordService = new UploadRecordService();
  console.log('Redis服务初始化成功');
} catch (error) {
  console.warn('Redis服务初始化失败，将使用内存存储:', error.message);
}

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise rejection:', reason);
});

// 安全中间件
app.use(helmet());

// 中间件
app.use(cors(config.cors));
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// 应用速率限制
// 静态文件服务
const UPLOAD_DIR = config.upload.uploadDir;
fs.ensureDirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR));

// 路由
app.use('/api/health', healthRoutes);

// 上传相关路由 - 应用速率限制和文件验证
app.use('/api/upload', uploadRoutes);

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://${config.server.host}:${PORT}`);
  console.log(`Environment: ${config.server.env}`);
  console.log(`Upload directory: ${UPLOAD_DIR}`);
});

export default app;
