import path from 'path';
import Joi from 'joi';

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.zip',
  '.rar',
  '.txt',
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.mp3',
  '.wav',
  '.flac',
];

// 禁止的文件扩展名（可执行文件等）
const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.vbs', '.js', '.jar', '.msi'];

// 文件名验证正则
const FILENAME_PATTERN = /^[^<>:"/\\|?*\x00-\x1F]+$/;

// 文件大小验证
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MIN_FILE_SIZE = 1; // 1字节

/**
 * 验证文件名
 */
function validateFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, message: '文件名不能为空' };
  }

  if (fileName.length > 255) {
    return { valid: false, message: '文件名长度不能超过255个字符' };
  }

  if (!FILENAME_PATTERN.test(fileName)) {
    return { valid: false, message: '文件名包含非法字符' };
  }

  return { valid: true };
}

/**
 * 验证文件扩展名
 */
function validateFileExtension(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (!ext) {
    return { valid: false, message: '文件缺少扩展名' };
  }

  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    return { valid: false, message: `不支持的文件类型: ${ext}` };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, message: `不支持的文件类型: ${ext}` };
  }

  return { valid: true, extension: ext };
}

/**
 * 验证文件大小
 */
function validateFileSize(fileSize) {
  if (typeof fileSize !== 'number' || isNaN(fileSize)) {
    return { valid: false, message: '文件大小无效' };
  }

  if (fileSize < MIN_FILE_SIZE) {
    return { valid: false, message: '文件大小不能为0' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, message: `文件大小超过限制（最大${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB）` };
  }

  return { valid: true };
}

/**
 * 文件验证中间件
 */
export const fileValidator = (req, res, next) => {
  try {
    const { fileName, fileSize, fileHash } = req.body;

    // 验证文件名
    const fileNameValidation = validateFileName(fileName);
    if (!fileNameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: fileNameValidation.message,
      });
    }

    // 验证文件扩展名
    const extValidation = validateFileExtension(fileName);
    if (!extValidation.valid) {
      return res.status(400).json({
        success: false,
        message: extValidation.message,
      });
    }

    // 验证文件大小
    if (fileSize) {
      const sizeValidation = validateFileSize(parseInt(fileSize));
      if (!sizeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: sizeValidation.message,
        });
      }
    }

    // 验证文件哈希（如果提供）
    if (fileHash) {
      const hashSchema = Joi.string().length(32).required();
      const { error } = hashSchema.validate(fileHash);
      if (error) {
        return res.status(400).json({
          success: false,
          message: '文件哈希格式无效',
        });
      }
    }

    // 将验证结果附加到请求对象
    req.fileValidation = {
      fileName,
      extension: extValidation.extension,
      fileSize: fileSize ? parseInt(fileSize) : null,
      fileHash,
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '文件验证失败',
      error: error.message,
    });
  }
};

/**
 * 分片验证中间件
 */
export const chunkValidator = (req, res, next) => {
  try {
    const { fileHash, chunkIndex, chunkSize, chunkHash, totalChunks } = req.body;

    // 验证文件哈希
    const hashSchema = Joi.string().length(32).required();
    const { error: hashError } = hashSchema.validate(fileHash);
    if (hashError) {
      return res.status(400).json({
        success: false,
        message: '文件哈希格式无效',
      });
    }

    // 验证分片索引
    const indexSchema = Joi.number().integer().min(0).required();
    const { error: indexError } = indexSchema.validate(chunkIndex);
    if (indexError) {
      return res.status(400).json({
        success: false,
        message: '分片索引无效',
      });
    }

    // 验证分片大小
    const sizeSchema = Joi.number().integer().min(1).max(100 * 1024 * 1024).required(); // 最大100MB
    const { error: sizeError } = sizeSchema.validate(chunkSize);
    if (sizeError) {
      return res.status(400).json({
        success: false,
        message: '分片大小无效（最大100MB）',
      });
    }

    // 验证分片哈希
    if (chunkHash) {
      const chunkHashSchema = Joi.string().length(32).required();
      const { error: chunkHashError } = chunkHashSchema.validate(chunkHash);
      if (chunkHashError) {
        return res.status(400).json({
          success: false,
          message: '分片哈希格式无效',
        });
      }
    }

    // 验证总分片数
    const totalSchema = Joi.number().integer().min(1).required();
    const { error: totalError } = totalSchema.validate(totalChunks);
    if (totalError) {
      return res.status(400).json({
        success: false,
        message: '总分片数无效',
      });
    }

    // 验证分片索引是否在有效范围内
    if (parseInt(chunkIndex) >= parseInt(totalChunks)) {
      return res.status(400).json({
        success: false,
        message: '分片索引超出范围',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '分片验证失败',
      error: error.message,
    });
  }
};

export default {
  fileValidator,
  chunkValidator,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_EXTENSIONS,
  MAX_FILE_SIZE,
};
