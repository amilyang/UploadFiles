/*
 * @Author: e0042176 e0042176@ceic.com
 * @Date: 2026-01-04 15:20:13
 * @LastEditors: e0042176 e0042176@ceic.com
 * @LastEditTime: 2026-01-04 15:29:08
 * @FilePath: \UploadFiles\src\api\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 文件上传相关的API接口
 */

// API基础URL
const API_BASE_URL = '/api/upload';

/**
 * 检查文件是否存在（秒传）
 * @param fileHash 文件哈希值
 * @param fileName 文件名
 * @returns 文件是否存在
 */
export const checkFileExists = async (fileHash: string, fileName: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileHash, fileName }),
    });
    const data = await response.json();
    return data.exist;
  } catch (error) {
    console.error('检查文件是否存在失败:', error);
    return false;
  }
};

/**
 * 上传文件分片
 * @param chunk 分片数据
 * @param fileHash 文件哈希值
 * @param fileName 文件名
 * @param index 分片索引
 * @param chunkSize 分片大小
 * @param chunkHash 分片哈希值
 * @param totalChunks 总分片数
 * @returns 上传结果
 */
export const uploadChunk = async (
  chunk: Blob,
  fileHash: string,
  fileName: string,
  index: number,
  chunkSize: number,
  chunkHash: string,
  totalChunks: number
): Promise<void> => {
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('fileHash', fileHash);
  formData.append('fileName', fileName);
  formData.append('index', index.toString());
  formData.append('chunkSize', chunkSize.toString());
  formData.append('chunkHash', chunkHash);
  formData.append('totalChunks', totalChunks.toString());

  const response = await fetch(`${API_BASE_URL}/chunk`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('上传分片失败');
  }
};

/**
 * 合并文件分片
 * @param fileHash 文件哈希值
 * @param fileName 文件名
 * @returns 合并结果
 */
export const mergeChunks = async (fileHash: string, fileName: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileHash,
      fileName,
    }),
  });

  if (!response.ok) {
    throw new Error('合并分片失败');
  }
};
