import type { Ref } from 'vue';
import { ref } from 'vue';
import { mergeChunks as apiMergeChunks, checkFileExists, uploadChunk } from '../api';
import type { ChunkState, ChunkTask, FileTask, UploadSpeed, WorkerMessage } from '../types';

export interface UseFileUploadOptions {
  chunkSize?: number;
  maxConcurrency?: number;
  maxRetries?: number;
  apiUrl?: string;
}

export interface UseFileUploadReturn {
  files: Ref<FileTask[]>;
  isUploading: Ref<boolean>;
  totalProgress: Ref<number>;
  selectedFiles: Ref<File[]>;
  handleFileSelect: (event: Event) => void;
  handleDrop: (event: DragEvent) => void;
  handleDragOver: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  uploadFile: (file: File) => Promise<void>;
  uploadAllFiles: () => Promise<void>;
  cancelUpload: (fileId: string) => void;
  retryUpload: (fileId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  calculateUploadSpeed: (
    totalBytes: number,
    uploadedBytes: number,
    startTime: number
  ) => UploadSpeed;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    chunkSize = 5 * 1024 * 1024,
    maxConcurrency = 3,
    maxRetries = 3,
    apiUrl = '/api/upload',
  } = options;

  const files = ref<FileTask[]>([]);
  const isUploading = ref(false);
  const totalProgress = ref(0);
  const selectedFiles = ref<File[]>([]);

  // 计算总进度
  const calculateTotalProgress = () => {
    if (files.value.length === 0) {
      totalProgress.value = 0;
      return;
    }

    const totalBytes = files.value.reduce((sum, file) => sum + file.size, 0);
    const uploadedBytes = files.value.reduce((sum, file) => sum + (file.uploadedBytes || 0), 0);
    totalProgress.value = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
  };

  // 处理文件选择
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      addFiles(Array.from(target.files));
      target.value = '';
    }
  };

  // 处理拖放
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files) {
      addFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // 添加文件到队列
  const addFiles = (newFiles: File[]) => {
    newFiles.forEach((file) => {
      const fileTask: FileTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        uploadedBytes: 0,
        chunks: [],
        fileHash: '',
        error: null,
        createdAt: new Date(),
        uploadSpeed: {
          currentSpeed: 0,
          averageSpeed: 0,
          estimatedTime: 0,
        },
      };
      files.value.push(fileTask);
    });
  };

  // 上传单个文件
  const uploadFile = async (file: File): Promise<void> => {
    const fileTask = files.value.find((f) => f.file === file);
    if (!fileTask) throw new Error('File not found');

    fileTask.status = 'uploading';
    fileTask.startTime = Date.now(); // 记录开始时间
    isUploading.value = true;

    try {
      // 1. 计算文件哈希
      fileTask.fileHash = await calculateFileHash(file);

      // 2. 检查是否已存在（秒传）
      const exists = await checkFileExists(fileTask.fileHash, fileTask.name);
      if (exists) {
        fileTask.status = 'completed';
        fileTask.progress = 100;
        fileTask.uploadedBytes = file.size;
        calculateTotalProgress();
        return;
      }

      // 3. 切片并上传
      const chunks = await sliceFile(file, fileTask.id, chunkSize);
      fileTask.chunks = chunks;

      await uploadChunks(fileTask, maxConcurrency, maxRetries);

      // 4. 合并分片
      await mergeChunks(fileTask);

      fileTask.status = 'completed';
      fileTask.progress = 100;
      fileTask.uploadedBytes = file.size;
    } catch (error) {
      fileTask.status = 'failed';
      fileTask.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      isUploading.value = files.value.some((f) => f.status === 'uploading');
      calculateTotalProgress();
    }
  };

  // 上传所有文件
  const uploadAllFiles = async () => {
    const pendingFiles = files.value.filter((f) => f.status === 'pending');
    for (const fileTask of pendingFiles) {
      await uploadFile(fileTask.file);
    }
  };

  // 取消上传
  const cancelUpload = (fileId: string) => {
    const fileTask = files.value.find((f) => f.id === fileId);
    if (fileTask) {
      fileTask.status = 'canceled';
      isUploading.value = files.value.some((f) => f.status === 'uploading');
    }
  };

  // 重试上传
  const retryUpload = async (fileId: string) => {
    const fileTask = files.value.find((f) => f.id === fileId);
    if (fileTask) {
      fileTask.status = 'pending';
      fileTask.error = null;
      await uploadFile(fileTask.file);
    }
  };

  // 清除已完成
  const clearCompleted = () => {
    files.value = files.value.filter((f) => f.status !== 'completed');
    calculateTotalProgress();
  };

  // 清除所有
  const clearAll = () => {
    files.value = [];
    totalProgress.value = 0;
  };

  // 计算文件哈希
  const calculateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/fileSliceWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.postMessage({
        type: 'CALCULATE_HASH',
        data: { file, chunkSize },
      });

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'HASH_COMPLETE') {
          resolve(e.data.data.fileHash);
          worker.terminate();
        } else if (e.data.type === 'HASH_ERROR') {
          reject(new Error(e.data.data.error));
          worker.terminate();
        }
      };

      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
    });
  };

  // 切片文件
  const sliceFile = async (file: File, fileId: string, size: number): Promise<ChunkTask[]> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/fileSliceWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.postMessage({
        type: 'SLICE_FILE',
        data: { file, fileId, chunkSize: size },
      });

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'SLICE_COMPLETE') {
          // 将 ChunkInfo 转换为 ChunkTask
          const chunks: ChunkTask[] = e.data.data.chunks.map((chunkInfo: any) => ({
            chunkId: chunkInfo.chunkId,
            index: chunkInfo.index,
            chunkHash: chunkInfo.chunkHash,
            chunk: chunkInfo.chunk,
            state: chunkInfo.state as ChunkState,
          }));
          resolve(chunks);
          worker.terminate();
        } else if (e.data.type === 'SLICE_ERROR') {
          reject(new Error(e.data.data.error));
          worker.terminate();
        }
      };

      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
    });
  };

  // 上传分片
  const uploadChunks = async (
    fileTask: FileTask,
    concurrency: number,
    retries: number
  ): Promise<void> => {
    const chunks = fileTask.chunks?.filter((c) => c.state === 'pending') || [];
    let uploadedCount = 0;
    let lastUploadedBytes = 0;
    let lastUpdateTime = Date.now();

    // 初始化总分片数量
    fileTask.totalChunks = fileTask.chunks!.length;

    const uploadChunkWithRetry = async (chunk: ChunkTask, retryCount = 0): Promise<void> => {
      try {
        chunk.state = 'uploading';

        // 使用API函数上传分片
        await uploadChunk(
          chunk.chunk,
          fileTask.fileHash,
          fileTask.name,
          chunk.index,
          chunkSize,
          chunk.chunkHash,
          fileTask.chunks.length
        );

        chunk.state = 'completed';
        uploadedCount++;

        // 更新已上传分片数量
        fileTask.uploadedChunks = uploadedCount;

        const progress = (uploadedCount / fileTask.chunks!.length) * 100;
        fileTask.progress = progress;
        fileTask.uploadedBytes = (fileTask.size * progress) / 100;

        // 计算上传速度
        const currentTime = Date.now();
        const timeElapsed = (currentTime - lastUpdateTime) / 1000; // 转换为秒
        const bytesUploaded = fileTask.uploadedBytes - lastUploadedBytes;

        if (timeElapsed > 0 && bytesUploaded > 0) {
          fileTask.uploadSpeed = calculateUploadSpeed(
            fileTask.uploadedBytes,
            fileTask.size,
            fileTask.startTime || currentTime,
            bytesUploaded,
            timeElapsed
          );
        }

        lastUploadedBytes = fileTask.uploadedBytes;
        lastUpdateTime = currentTime;

        calculateTotalProgress();
      } catch (error) {
        if (retryCount < retries) {
          chunk.state = 'pending';
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
          return uploadChunkWithRetry(chunk, retryCount + 1);
        }
        chunk.state = 'failed';
        throw error;
      }
    };

    const uploadInBatches = async (chunksToUpload: ChunkTask[]): Promise<void> => {
      for (let i = 0; i < chunksToUpload.length; i += concurrency) {
        const batch = chunksToUpload.slice(i, i + concurrency);
        await Promise.all(batch.map((chunk) => uploadChunkWithRetry(chunk)));
      }
    };

    await uploadInBatches(chunks);
  };

  // 合并分片
  const mergeChunks = async (fileTask: FileTask): Promise<void> => {
    // 使用API函数合并分片
    await apiMergeChunks(fileTask.fileHash, fileTask.name);
  };

  // src/composables/useFileUpload.ts
  // 添加上传速度计算（增强版，使用滑动平均算法）

  // 速度历史记录（用于计算滑动平均）
  const speedHistory = ref<{ speed: number; timestamp: number }[]>([]);
  const MAX_SPEED_HISTORY = 10; // 保留最近10次速度记录

  /**
   * 计算上传速度（增强版）
   * @param uploadedBytes - 已上传字节数
   * @param totalBytes - 文件总字节数
   * @param startTime - 上传开始时间戳
   * @param bytesUploaded - 最近一次上传的字节数（可选）
   * @param timeElapsed - 最近一次上传的时间（秒）（可选）
   * @returns 上传速度信息
   */
  const calculateUploadSpeed = (
    uploadedBytes: number,
    totalBytes: number,
    startTime: number,
    bytesUploaded?: number,
    timeElapsed?: number
  ): UploadSpeed => {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000; // 秒

    if (elapsed <= 0 || uploadedBytes <= 0) {
      return {
        currentSpeed: 0,
        averageSpeed: 0,
        estimatedTime: 0,
      };
    }

    // 计算当前速度 - 如果提供了最近上传数据，使用它来计算更准确的速度
    let currentSpeed: number;
    if (bytesUploaded !== undefined && timeElapsed !== undefined && timeElapsed > 0) {
      currentSpeed = bytesUploaded / timeElapsed / 1024; // KB/s
    } else {
      currentSpeed = uploadedBytes / elapsed / 1024; // KB/s
    }

    // 添加到速度历史记录
    speedHistory.value.push({ speed: currentSpeed, timestamp: now });

    // 限制历史记录数量
    if (speedHistory.value.length > MAX_SPEED_HISTORY) {
      speedHistory.value.shift();
    }

    // 计算滑动平均速度
    let averageSpeed = currentSpeed;
    if (speedHistory.value.length > 1) {
      const totalSpeed = speedHistory.value.reduce((sum, record) => sum + record.speed, 0);
      averageSpeed = totalSpeed / speedHistory.value.length;
    }

    // 计算预计剩余时间
    const remainingBytes = totalBytes - uploadedBytes;
    const estimatedTime = remainingBytes / (averageSpeed * 1024); // 秒

    return {
      currentSpeed,
      averageSpeed,
      estimatedTime,
    };
  };

  /**
   * 重置速度历史记录
   */
  const resetSpeedHistory = () => {
    speedHistory.value = [];
  };

  return {
    files,
    isUploading,
    totalProgress,
    selectedFiles,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    uploadFile,
    uploadAllFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
    calculateUploadSpeed,
  };
}
