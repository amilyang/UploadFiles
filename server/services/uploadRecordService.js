import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
};

// 创建Redis客户端
let redisClient = null;

/**
 * 初始化Redis连接
 */
export async function initRedis() {
  try {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // 测试连接
    await redisClient.ping();
    logger.info('Redis connection test passed');

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    throw error;
  }
}

/**
 * 获取Redis客户端
 */
export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * 关闭Redis连接
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * 上传记录服务
 */
export class UploadRecordService {
  /**
   * 保存上传记录
   */
  static async saveRecord(fileHash, record) {
    try {
      const redis = getRedisClient();
      const key = `upload:record:${fileHash}`;
      const value = JSON.stringify({
        ...record,
        updatedAt: new Date().toISOString(),
      });

      await redis.setex(key, 86400, value); // 24小时过期

      logger.debug('Upload record saved', { fileHash });
      return { success: true };
    } catch (error) {
      logger.error('Failed to save upload record', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取上传记录
   */
  static async getRecord(fileHash) {
    try {
      const redis = getRedisClient();
      const key = `upload:record:${fileHash}`;
      const value = await redis.get(key);

      if (!value) {
        return { success: false, message: 'Record not found' };
      }

      const record = JSON.parse(value);
      logger.debug('Upload record retrieved', { fileHash });
      return { success: true, data: record };
    } catch (error) {
      logger.error('Failed to get upload record', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除上传记录
   */
  static async deleteRecord(fileHash) {
    try {
      const redis = getRedisClient();
      const key = `upload:record:${fileHash}`;
      await redis.del(key);

      logger.debug('Upload record deleted', { fileHash });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete upload record', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新上传进度
   */
  static async updateProgress(fileHash, chunkIndex, totalChunks) {
    try {
      const redis = getRedisClient();
      const key = `upload:progress:${fileHash}`;
      const progress = ((chunkIndex + 1) / totalChunks) * 100;

      await redis.hset(key, {
        currentChunk: chunkIndex,
        totalChunks,
        progress: progress.toFixed(2),
        lastUpdated: new Date().toISOString(),
      });

      await redis.expire(key, 86400); // 24小时过期

      logger.debug('Upload progress updated', { fileHash, progress });
      return { success: true, progress };
    } catch (error) {
      logger.error('Failed to update upload progress', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取上传进度
   */
  static async getProgress(fileHash) {
    try {
      const redis = getRedisClient();
      const key = `upload:progress:${fileHash}`;
      const progress = await redis.hgetall(key);

      if (!progress || Object.keys(progress).length === 0) {
        return { success: false, message: 'Progress not found' };
      }

      logger.debug('Upload progress retrieved', { fileHash });
      return { success: true, data: progress };
    } catch (error) {
      logger.error('Failed to get upload progress', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存已上传的分片列表
   */
  static async saveUploadedChunks(fileHash, uploadedChunks) {
    try {
      const redis = getRedisClient();
      const key = `upload:chunks:${fileHash}`;

      // 将分片索引列表转换为字符串
      const chunksStr = JSON.stringify(uploadedChunks);
      await redis.setex(key, 86400, chunksStr); // 24小时过期

      logger.debug('Uploaded chunks saved', { fileHash, count: uploadedChunks.length });
      return { success: true };
    } catch (error) {
      logger.error('Failed to save uploaded chunks', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取已上传的分片列表
   */
  static async getUploadedChunks(fileHash) {
    try {
      const redis = getRedisClient();
      const key = `upload:chunks:${fileHash}`;
      const chunksStr = await redis.get(key);

      if (!chunksStr) {
        return { success: false, message: 'Chunks not found', data: [] };
      }

      const chunks = JSON.parse(chunksStr);
      logger.debug('Uploaded chunks retrieved', { fileHash, count: chunks.length });
      return { success: true, data: chunks };
    } catch (error) {
      logger.error('Failed to get uploaded chunks', { fileHash, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 添加已上传的分片
   */
  static async addUploadedChunk(fileHash, chunkIndex) {
    try {
      const redis = getRedisClient();
      const key = `upload:chunks:${fileHash}`;

      // 使用集合存储分片索引
      await redis.sadd(key, chunkIndex);
      await redis.expire(key, 86400); // 24小时过期

      logger.debug('Uploaded chunk added', { fileHash, chunkIndex });
      return { success: true };
    } catch (error) {
      logger.error('Failed to add uploaded chunk', { fileHash, chunkIndex, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查分片是否已上传
   */
  static async isChunkUploaded(fileHash, chunkIndex) {
    try {
      const redis = getRedisClient();
      const key = `upload:chunks:${fileHash}`;

      const isUploaded = await redis.sismember(key, chunkIndex);
      return { success: true, data: isUploaded === 1 };
    } catch (error) {
      logger.error('Failed to check chunk upload status', { fileHash, chunkIndex, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取所有上传中的文件
   */
  static async getAllUploadingFiles() {
    try {
      const redis = getRedisClient();
      const pattern = 'upload:record:*';
      const keys = await redis.keys(pattern);

      const records = [];
      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          records.push(JSON.parse(value));
        }
      }

      logger.debug('All uploading files retrieved', { count: records.length });
      return { success: true, data: records };
    } catch (error) {
      logger.error('Failed to get all uploading files', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理过期记录
   */
  static async cleanupExpiredRecords() {
    try {
      const redis = getRedisClient();
      const pattern = 'upload:*';
      const keys = await redis.keys(pattern);

      let deletedCount = 0;
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2) {
          await redis.del(key);
          deletedCount++;
        }
      }

      logger.info('Expired records cleaned up', { count: deletedCount });
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup expired records', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取统计信息
   */
  static async getStatistics() {
    try {
      const redis = getRedisClient();
      const pattern = 'upload:record:*';
      const keys = await redis.keys(pattern);

      let totalSize = 0;
      let completedCount = 0;
      let uploadingCount = 0;
      let failedCount = 0;

      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          const record = JSON.parse(value);
          totalSize += record.fileSize || 0;

          if (record.status === 'completed') {
            completedCount++;
          } else if (record.status === 'uploading') {
            uploadingCount++;
          } else if (record.status === 'failed') {
            failedCount++;
          }
        }
      }

      const statistics = {
        totalFiles: keys.length,
        totalSize,
        completedCount,
        uploadingCount,
        failedCount,
      };

      logger.info('Upload statistics retrieved', statistics);
      return { success: true, data: statistics };
    } catch (error) {
      logger.error('Failed to get upload statistics', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

export default UploadRecordService;
