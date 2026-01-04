import fs from 'fs-extra';
import path from 'path';
import { join } from 'path';
import config from '../config/index.js';

const UPLOAD_DIR = config.upload.uploadDir;

/**
 * 文件上传服务
 * 处理文件上传、验证、合并等业务逻辑
 */
export class UploadService {
  /**
   * 验证文件是否已存在或支持断点续传
   */
  static async verifyFile(fileHash, fileName) {
    const fileDir = join(UPLOAD_DIR, fileHash);
    const filePath = join(fileDir, fileName);

    // 检查文件是否已完整存在
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      return {
        success: true,
        exist: true,
        uploadedChunks: [],
        message: '文件已存在，可秒传',
        fileSize: stats.size,
      };
    }

    // 检查是否有上传记录（断点续传）
    const recordPath = join(fileDir, 'record.json');
    if (await fs.pathExists(recordPath)) {
      const record = await fs.readJson(recordPath);
      return {
        success: true,
        exist: false,
        uploadedChunks: record.uploadedChunks || [],
        totalChunks: record.totalChunks || 0,
        message: '发现上传记录，支持断点续传',
      };
    }

    // 创建文件目录
    await fs.ensureDir(fileDir);

    return {
      success: true,
      exist: false,
      uploadedChunks: [],
      totalChunks: 0,
      message: '新文件，开始上传',
    };
  }

  /**
   * 保存文件分片
   */
  static async saveChunk(fileHash, fileName, index, chunkSize, chunkHash, totalChunks, chunkPath) {
    const fileDir = join(UPLOAD_DIR, fileHash);
    const tempChunkDir = join(fileDir, 'temp_chunks');
    await fs.ensureDir(tempChunkDir);

    // 保存分片到临时目录
    const targetChunkPath = join(tempChunkDir, `${index}`);
    await fs.move(chunkPath, targetChunkPath, { overwrite: true });

    // 更新上传记录
    const recordPath = join(fileDir, 'record.json');
    let record = { uploadedChunks: [], fileName, totalChunks: parseInt(totalChunks) };

    if (await fs.pathExists(recordPath)) {
      try {
        record = await fs.readJson(recordPath);
      } catch (error) {
        // 如果record.json损坏，删除它并重新创建
        console.warn(`record.json损坏，重新创建: ${error.message}`);
        await fs.remove(recordPath);
        record = { uploadedChunks: [], fileName, totalChunks: parseInt(totalChunks) };
      }
    }

    const chunkIndex = parseInt(index);

    // 确保分片索引不重复添加
    if (!record.uploadedChunks.includes(chunkIndex)) {
      record.uploadedChunks.push(chunkIndex);
      // 使用原子写入避免文件损坏
      await fs.writeJson(recordPath, record, { spaces: 2 });
    }

    // 返回更新后的已上传分片列表
    const currentChunks = [...record.uploadedChunks].sort((a, b) => a - b);

    return {
      success: true,
      uploadedChunks: currentChunks,
      uploadedIndex: chunkIndex,
      uploadedCount: currentChunks.length,
      totalChunks: record.totalChunks,
      progress: parseFloat(((currentChunks.length / record.totalChunks) * 100).toFixed(2)),
      message: '分片上传成功',
    };
  }

  /**
   * 合并文件分片
   */
  static async mergeChunks(fileHash, fileName) {
    const fileDir = join(UPLOAD_DIR, fileHash);
    const recordPath = join(fileDir, 'record.json');
    const tempChunkDir = join(fileDir, 'temp_chunks');

    if (!(await fs.pathExists(recordPath))) {
      throw new Error('找不到上传记录');
    }

    let record;
    try {
      record = await fs.readJson(recordPath);
    } catch (error) {
      // 如果record.json损坏，尝试从临时分片目录重建
      console.warn(`record.json损坏，尝试重建: ${error.message}`);
      const chunkFiles = await fs.readdir(tempChunkDir);
      const uploadedChunks = chunkFiles
        .filter((f) => f.match(/^\d+$/))
        .map((f) => parseInt(f))
        .sort((a, b) => a - b);

      record = {
        uploadedChunks,
        fileName,
        totalChunks: uploadedChunks.length,
      };

      // 重建record.json
      await fs.writeJson(recordPath, record, { spaces: 2 });
    }

    const totalChunks = record.totalChunks || 0;
    const uploadedChunks = record.uploadedChunks || [];

    // 验证所有分片是否都已上传
    if (uploadedChunks.length !== totalChunks) {
      throw new Error(`分片未上传完整，已上传${uploadedChunks.length}/${totalChunks}`);
    }

    // 合并文件到最终目录
    const filePath = join(fileDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    // 按顺序合并所有分片
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(tempChunkDir, `${i}`);
      if (await fs.pathExists(chunkPath)) {
        const chunkData = await fs.readFile(chunkPath);
        writeStream.write(chunkData);
        // 删除临时分片文件
        await fs.remove(chunkPath);
      } else {
        writeStream.end();
        throw new Error(`分片 ${i} 不存在`);
      }
    }

    writeStream.end();

    // 删除临时分片目录
    try {
      await fs.remove(tempChunkDir);
    } catch (error) {
      console.warn('删除临时分片目录失败:', error);
    }

    // 删除上传记录
    await fs.remove(recordPath);

    // 验证合并后的文件大小
    const stats = await fs.stat(filePath);

    return {
      success: true,
      url: `/uploads/${fileHash}/${fileName}`,
      fileSize: stats.size,
      message: '文件合并成功',
    };
  }

  /**
   * 清理上传文件
   */
  static async cleanUpload(fileHash) {
    const fileDir = join(UPLOAD_DIR, fileHash);

    if (await fs.pathExists(fileDir)) {
      await fs.remove(fileDir);
    }

    return {
      success: true,
      message: '清理成功',
    };
  }

  /**
   * 验证分片完整性
   */
  static async verifyChunkIntegrity(fileHash, chunkIndex, chunkHash) {
    const crypto = await import('crypto');
    const fileDir = join(UPLOAD_DIR, fileHash);
    const tempChunkDir = join(fileDir, 'temp_chunks');
    const chunkPath = join(tempChunkDir, `${chunkIndex}`);

    if (!(await fs.pathExists(chunkPath))) {
      return { valid: false, reason: '分片不存在' };
    }

    const chunkData = await fs.readFile(chunkPath);
    const actualHash = crypto.createHash('md5').update(chunkData).digest('hex');

    if (actualHash !== chunkHash) {
      await fs.remove(chunkPath);
      return { valid: false, reason: '分片损坏' };
    }

    return { valid: true };
  }
}
