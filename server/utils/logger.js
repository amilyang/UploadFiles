import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台日志格式
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// 日志传输
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // 错误日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // 所有日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // HTTP请求日志
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/http.log'),
    level: 'http',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false, // 不退出进程
});

// 创建子logger用于不同场景
export const uploadLogger = logger.child({ module: 'upload' });
export const apiLogger = logger.child({ module: 'api' });
export const errorLogger = logger.child({ module: 'error' });
export const performanceLogger = logger.child({ module: 'performance' });

// 记录上传开始
export const logUploadStart = (fileHash, fileName, fileSize) => {
  uploadLogger.info('Upload started', {
    fileHash,
    fileName,
    fileSize,
    timestamp: new Date().toISOString(),
  });
};

// 记录上传进度
export const logUploadProgress = (fileHash, chunkIndex, totalChunks, progress) => {
  uploadLogger.debug('Upload progress', {
    fileHash,
    chunkIndex,
    totalChunks,
    progress,
    timestamp: new Date().toISOString(),
  });
};

// 记录上传完成
export const logUploadComplete = (fileHash, fileName, duration, fileSize) => {
  uploadLogger.info('Upload completed', {
    fileHash,
    fileName,
    duration,
    fileSize,
    speed: fileSize / duration, // bytes/second
    timestamp: new Date().toISOString(),
  });
};

// 记录上传失败
export const logUploadError = (fileHash, fileName, error) => {
  errorLogger.error('Upload failed', {
    fileHash,
    fileName,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
};

// 记录秒传
export const logInstantUpload = (fileHash, fileName) => {
  uploadLogger.info('Instant upload (file already exists)', {
    fileHash,
    fileName,
    timestamp: new Date().toISOString(),
  });
};

// 记录断点续传
export const logResumeUpload = (fileHash, fileName, uploadedChunks, totalChunks) => {
  uploadLogger.info('Resume upload (chunks found)', {
    fileHash,
    fileName,
    uploadedChunks: uploadedChunks.length,
    totalChunks,
    progress: ((uploadedChunks.length / totalChunks) * 100).toFixed(2),
    timestamp: new Date().toISOString(),
  });
};

// 记录API请求
export const logApiRequest = (method, url, ip, userAgent) => {
  apiLogger.http('API request', {
    method,
    url,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });
};

// 记录API响应
export const logApiResponse = (method, url, statusCode, duration) => {
  apiLogger.http('API response', {
    method,
    url,
    statusCode,
    duration,
    timestamp: new Date().toISOString(),
  });
};

// 记录性能指标
export const logPerformance = (operation, duration, metadata = {}) => {
  performanceLogger.info('Performance metric', {
    operation,
    duration,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// 记录错误
export const logError = (error, context = {}) => {
  errorLogger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// 记录警告
export const logWarning = (message, context = {}) => {
  logger.warn('Warning', {
    message,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// 记录信息
export const logInfo = (message, context = {}) => {
  logger.info('Info', {
    message,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// 记录调试信息
export const logDebug = (message, context = {}) => {
  logger.debug('Debug', {
    message,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// 创建Morgan中间件格式
export const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

export default logger;
