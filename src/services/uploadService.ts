import type { ChunkTask } from '../types';

export interface UploadServiceConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class UploadService {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: UploadServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
  }

  // 检查文件是否存在（秒传）
  async checkFileExists(hash: string): Promise<boolean> {
    const response = await this.request<{ exists: boolean }>('/check', {
      method: 'POST',
      body: JSON.stringify({ hash }),
    });
    return response.exists;
  }

  // 上传分片
  async uploadChunk(
    chunk: ChunkTask,
    fileHash: string,
    filename: string,
    totalChunks: number
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk.chunk);
    formData.append('hash', fileHash);
    formData.append('index', chunk.index.toString());
    formData.append('total', totalChunks.toString());
    formData.append('filename', filename);

    await this.request('/chunk', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  // 合并分片
  async mergeChunks(hash: string, filename: string, totalChunks: number): Promise<void> {
    await this.request('/merge', {
      method: 'POST',
      body: JSON.stringify({ hash, filename, totalChunks }),
    });
  }

  // 取消上传
  async cancelUpload(hash: string): Promise<void> {
    await this.request('/cancel', {
      method: 'POST',
      body: JSON.stringify({ hash }),
    });
  }

  // 获取上传进度
  async getUploadProgress(hash: string): Promise<{
    uploadedChunks: number;
    totalChunks: number;
    progress: number;
  }> {
    return this.request('/progress', {
      method: 'GET',
      query: { hash },
    });
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: BodyInit | null;
      query?: Record<string, string>;
      isFormData?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query, isFormData = false } = options;

    // 构建URL
    let url = `${this.baseUrl}${endpoint}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    // 构建请求头
    const headers: Record<string, string> = {
      ...this.headers,
    };

    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // 更新配置
  updateConfig(config: Partial<UploadServiceConfig>): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.timeout !== undefined) this.timeout = config.timeout;
    if (config.headers) this.headers = { ...this.headers, ...config.headers };
  }
}

// 创建默认实例
export const uploadService = new UploadService({
  baseUrl: '/api/upload',
  timeout: 30000,
});
