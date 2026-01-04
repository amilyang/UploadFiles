import type { ChunkTask } from '../types';

export interface UseChunkManagerOptions {
  chunkSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface UseChunkManagerReturn {
  calculateOptimalChunkSize: (fileSize: number, networkSpeed?: number) => number;
  uploadWithRetry: (
    chunk: ChunkTask,
    uploadFn: (chunk: ChunkTask) => Promise<void>
  ) => Promise<void>;
  uploadChunksInParallel: (
    chunks: ChunkTask[],
    uploadFn: (chunk: ChunkTask) => Promise<void>,
    maxConcurrency?: number
  ) => Promise<void>;
  retryFailedChunks: (
    chunks: ChunkTask[],
    uploadFn: (chunk: ChunkTask) => Promise<void>
  ) => Promise<void>;
}

export function useChunkManager(options: UseChunkManagerOptions = {}): UseChunkManagerReturn {
  const { chunkSize = 5 * 1024 * 1024, maxRetries = 3, retryDelay = 1000 } = options;

  // 智能分片大小调整
  const calculateOptimalChunkSize = (fileSize: number, networkSpeed?: number): number => {
    // 根据文件大小动态调整
    if (fileSize < 100 * 1024 * 1024) {
      return 2 * 1024 * 1024; // 小文件：2MB
    } else if (fileSize < 1024 * 1024 * 1024) {
      return 5 * 1024 * 1024; // 中文件：5MB
    } else {
      return 10 * 1024 * 1024; // 大文件：10MB
    }
  };

  // 带重试的上传
  const uploadWithRetry = async (
    chunk: ChunkTask,
    uploadFn: (chunk: ChunkTask) => Promise<void>
  ): Promise<void> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await uploadFn(chunk);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        // 指数退避
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, i)));
      }
    }
  };

  // 并发控制上传
  const uploadChunksInParallel = async (
    chunks: ChunkTask[],
    uploadFn: (chunk: ChunkTask) => Promise<void>,
    maxConcurrency: number = 3
  ): Promise<void> => {
    const executing: Promise<void>[] = [];

    for (const chunk of chunks) {
      const promise = uploadWithRetry(chunk, uploadFn).then(() => {
        executing.splice(executing.indexOf(promise), 1);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  };

  // 重试失败的分片
  const retryFailedChunks = async (
    chunks: ChunkTask[],
    uploadFn: (chunk: ChunkTask) => Promise<void>
  ): Promise<void> => {
    const failedChunks = chunks.filter((c) => c.state === 'failed');
    if (failedChunks.length === 0) return;

    for (const chunk of failedChunks) {
      chunk.state = 'pending';
      await uploadWithRetry(chunk, uploadFn);
    }
  };

  return {
    calculateOptimalChunkSize,
    uploadWithRetry,
    uploadChunksInParallel,
    retryFailedChunks,
  };
}
