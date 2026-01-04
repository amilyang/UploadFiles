import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

/**
 * 应用配置
 * 集中管理所有配置项
 */
export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT) || 8082,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // 上传配置
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024 * 1024, // 2GB
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 5 * 1024 * 1024, // 5MB
    maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS) || 3,
    uploadDir: process.env.UPLOAD_DIR || join(process.cwd(), '..', 'uploads'),
    tempDir: process.env.TEMP_DIR || join(process.cwd(), '..', 'uploads', 'temp'),
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
};

/**
 * 验证配置
 * 检查必要的配置项是否存在
 */
export const validateConfig = () => {
  const required = ['server.port', 'upload.uploadDir'];

  for (const key of required) {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined || value === null) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }

  console.log('✓ Configuration validated successfully');
};

export default config;
