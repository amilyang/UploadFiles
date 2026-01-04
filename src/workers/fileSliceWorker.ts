/**
 * Web Worker - 文件切片处理器
 * 用于在后台线程中处理大文件的切片操作，避免阻塞主线程
 */

import SparkMD5 from 'spark-md5';
import type {
  CalculateHashData,
  ChunkInfo,
  HashCompleteData,
  HashErrorData,
  HashProgressData,
  SliceCompleteData,
  SliceErrorData,
  SliceFileData,
  SliceProgressData,
  WorkerMessage,
} from '../types';

// 监听主线程发送的消息
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  switch (type) {
    case 'SLICE_FILE':
      await sliceFile(data as SliceFileData);
      break;
    case 'CALCULATE_HASH':
      await calculateHash(data as CalculateHashData);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

/**
 * 切割文件
 * @param data - 包含 file, chunkSize, fileId 的对象
 */
async function sliceFile(data: SliceFileData): Promise<void> {
  const { file, chunkSize, fileId } = data;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const chunks: ChunkInfo[] = [];

  try {
    // 分批处理，避免一次性创建过多分片对象
    const BATCH_SIZE = 100; // 每批处理100个分片

    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalChunks);

      for (let j = i; j < batchEnd; j++) {
        const start = j * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        chunks.push({
          chunkId: `${fileId}-chunk-${j}`,
          index: j,
          chunk,
          chunkHash: `${fileId}-${j}`,
          state: 'pending',
          retryCount: 0,
        });
      }

      // 发送进度更新
      self.postMessage({
        type: 'SLICE_PROGRESS',
        data: {
          fileId,
          progress: Math.round((batchEnd / totalChunks) * 100),
          processedChunks: batchEnd,
          totalChunks,
        } as SliceProgressData,
      });
    }

    // 切片完成
    self.postMessage({
      type: 'SLICE_COMPLETE',
      data: {
        fileId,
        chunks,
        totalChunks,
      } as SliceCompleteData,
    });
  } catch (error) {
    self.postMessage({
      type: 'SLICE_ERROR',
      data: {
        fileId,
        error: error instanceof Error ? error.message : String(error),
      } as SliceErrorData,
    });
  }
}

/**
 * 计算文件哈希（使用 SparkMD5）
 * @param data - 包含 file, chunkSize 的对象
 */
async function calculateHash(data: CalculateHashData): Promise<void> {
  const { file, chunkSize } = data;

  try {
    // 使用增量哈希计算，避免大文件内存溢出
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    // 读取文件并计算哈希
    const loadNext = (): void => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      fileReader.readAsArrayBuffer(chunk);
    };

    return new Promise((resolve, reject) => {
      fileReader.onload = (e: ProgressEvent<FileReader>) => {
        spark.append(e.target?.result as ArrayBuffer);
        currentChunk++;

        // 发送进度更新
        self.postMessage({
          type: 'HASH_PROGRESS',
          data: {
            progress: Math.round((currentChunk / totalChunks) * 100),
            processedChunks: currentChunk,
            totalChunks,
          } as HashProgressData,
        });

        if (currentChunk < totalChunks) {
          loadNext();
        } else {
          // 计算完成
          const fileHash = spark.end();
          self.postMessage({
            type: 'HASH_COMPLETE',
            data: {
              fileHash,
            } as HashCompleteData,
          });
          resolve();
        }
      };

      fileReader.onerror = (error) => {
        self.postMessage({
          type: 'HASH_ERROR',
          data: {
            error: error instanceof Error ? error.message : '读取文件失败',
          } as HashErrorData,
        });
        reject(error);
      };

      // 开始读取第一个分片
      loadNext();
    });
  } catch (error) {
    self.postMessage({
      type: 'HASH_ERROR',
      data: {
        error: error instanceof Error ? error.message : String(error),
      } as HashErrorData,
    });
  }
}

export {};
