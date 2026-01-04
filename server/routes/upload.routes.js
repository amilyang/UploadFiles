import { Router } from 'express';
import fs from 'fs-extra';
import { join } from 'path';
import { upload } from '../controllers/upload.controller.js';
import { UploadService } from '../services/upload.service.js';

const router = Router();

/**
 * 秒传/断点续传验证接口
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { fileHash, fileName } = req.body;

    if (!fileHash || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        uploadedChunks: [],
      });
    }

    const result = await UploadService.verifyFile(fileHash, fileName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 上传分片接口
 */
router.post('/chunk', upload.single('chunk'), async (req, res, next) => {
  try {
    const { fileHash, fileName, index, chunkSize, chunkHash, totalChunks } = req.body;
    const chunk = req.file;

    if (!chunk) {
      return res.status(400).json({
        success: false,
        message: '没有接收到文件分片',
        uploadedChunks: [],
      });
    }

    // 参数验证
    if (!fileHash || !fileName || index === undefined || !chunkSize || !chunkHash || !totalChunks) {
      await fs.remove(chunk.path);
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
        uploadedChunks: [],
      });
    }

    const result = await UploadService.saveChunk(
      fileHash,
      fileName,
      index,
      chunkSize,
      chunkHash,
      totalChunks,
      chunk.path
    );

    res.json(result);
  } catch (error) {
    // 清理可能已保存的分片文件
    try {
      const chunkIndex = parseInt(req.body?.index);
      const fileHash = req.body?.fileHash;
      if (chunkIndex !== undefined && fileHash) {
        const UPLOAD_DIR = join(process.cwd(), 'uploads');
        const fileDir = join(UPLOAD_DIR, fileHash);
        const tempChunkDir = join(fileDir, 'temp_chunks');
        const chunkPath = join(tempChunkDir, `${chunkIndex}`);
        if (await fs.pathExists(chunkPath)) {
          await fs.remove(chunkPath);
        }
      }
    } catch (cleanupError) {
      console.warn('清理分片文件失败:', cleanupError);
    }

    next(error);
  }
});

/**
 * 合并分片接口
 */
router.post('/merge', async (req, res, next) => {
  try {
    const { fileHash, fileName } = req.body;

    if (!fileHash || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
    }

    const result = await UploadService.mergeChunks(fileHash, fileName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 清理上传
 */
router.post('/clean', async (req, res, next) => {
  try {
    const { fileHash } = req.body;

    if (!fileHash) {
      return res.status(400).json({
        success: false,
        message: '缺少文件哈希',
      });
    }

    const result = await UploadService.cleanUpload(fileHash);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as uploadRoutes };
