/**
 * 全局类型定义文件
 * 集中管理项目中所有类型定义
 */

// ============================================================================
// 上传相关类型
// ============================================================================

/**
 * 上传状态类型
 */
export type UploadStatus =
  | 'slicing'
  | 'pending'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

/**
 * 分片状态类型
 */
export type ChunkState = 'pending' | 'uploading' | 'completed' | 'failed';

/**
 * 分片任务接口
 */
export interface ChunkTask {
  chunkId: string;
  index: number;
  chunkHash: string;
  chunk: Blob;
  state: ChunkState;
}

/**
 * 文件任务接口
 */
export interface FileTask {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  uploadedBytes?: number;
  uploadedChunks?: number;
  totalChunks?: number;
  chunks: ChunkTask[];
  uploadingChunks?: Map<string, ChunkTask>;
  fileHash: string;
  error: string | null;
  createdAt?: Date;
  // 上传速度相关字段
  uploadSpeed?: UploadSpeed;
  startTime?: number;
}

// ============================================================================
// Web Worker 相关类型
// ============================================================================

/**
 * Worker 消息类型
 */
export type WorkerMessageType =
  | 'SLICE_FILE'
  | 'CALCULATE_HASH'
  | 'HASH_PROGRESS'
  | 'HASH_COMPLETE'
  | 'HASH_ERROR'
  | 'SLICE_PROGRESS'
  | 'SLICE_COMPLETE'
  | 'SLICE_ERROR';

/**
 * Worker 消息接口
 */
export interface WorkerMessage<T = any> {
  type: WorkerMessageType;
  data: T;
}

/**
 * 哈希计算进度数据
 */
export interface HashProgressData {
  progress: number;
  processedChunks: number;
  totalChunks: number;
}

/**
 * 哈希计算完成数据
 */
export interface HashCompleteData {
  fileHash: string;
}

/**
 * 哈希计算错误数据
 */
export interface HashErrorData {
  error: string;
}

/**
 * 切片文件数据
 */
export interface SliceFileData {
  file: File;
  chunkSize: number;
  fileId: string;
}

/**
 * 计算哈希数据
 */
export interface CalculateHashData {
  file: File;
  chunkSize: number;
}

/**
 * 分片信息接口
 */
export interface ChunkInfo {
  chunkId: string;
  index: number;
  chunk: Blob;
  chunkHash: string;
  state: ChunkState;
  retryCount: number;
}

/**
 * 切片进度数据
 */
export interface SliceProgressData {
  fileId: string;
  progress: number;
  processedChunks: number;
  totalChunks: number;
}

/**
 * 切片完成数据
 */
export interface SliceCompleteData {
  fileId: string;
  chunks: ChunkInfo[];
  totalChunks: number;
}

/**
 * 切片错误数据
 */
export interface SliceErrorData {
  fileId: string;
  error: string;
}

// ============================================================================
// 并发限流器相关类型
// ============================================================================

/**
 * 等待任务接口
 */
export interface WaitingTask<T = any> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

/**
 * 限流器状态接口
 */
export interface LimiterStatus {
  runningCount: number;
  waitingCount: number;
  maxConcurrency: number;
}

// ============================================================================
// 组件 Props 类型
// ============================================================================

/**
 * ProgressBar 组件 Props 接口
 */
export interface ProgressBarProps {
  progress?: number;
  status?: UploadStatus;
  uploadedChunks?: number;
  totalChunks?: number;
  showChunkInfo?: boolean;
  uploadSpeed?: UploadSpeed;
}

/**
 * UploadQueue 组件 Props 接口
 */
export interface UploadQueueProps {
  fileTasks: FileTask[];
}

/**
 * UploadQueue 组件事件类型
 */
export interface UploadQueueEmits {
  pause: [fileTask: FileTask];
  resume: [fileTask: FileTask];
  remove: [fileTask: FileTask];
}

// ============================================================================
// 工具函数类型
// ============================================================================

/**
 * 格式化文件大小
 * @param bytes - 文件字节数
 * @returns 格式化后的文件大小字符串
 */
export type FormatFileSize = (bytes: number) => string;

/**
 *  计算上传速度
 */
export interface UploadSpeed {
  currentSpeed: number; // 当前速度 KB/s
  averageSpeed: number; // 平均速度 KB/s
  estimatedTime: number; // 预计剩余时间（秒）
}
