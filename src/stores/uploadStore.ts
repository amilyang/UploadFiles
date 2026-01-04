import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { FileTask, UploadStatus } from '../types';
import { useFileUpload } from '../composables/useFileUpload';

export const useUploadStore = defineStore('upload', () => {
  // 状态
  const files = ref<FileTask[]>([]);
  const isUploading = ref(false);
  const totalProgress = ref(0);
  const selectedFiles = ref<File[]>([]);

  // 使用组合式函数
  const uploadComposable = useFileUpload({
    chunkSize: 5 * 1024 * 1024,
    maxConcurrency: 3,
    maxRetries: 3,
  });

  // 计算属性
  const pendingFiles: ComputedRef<FileTask[]> = computed(() =>
    files.value.filter((f) => f.status === 'pending')
  );

  const uploadingFiles: ComputedRef<FileTask[]> = computed(() =>
    files.value.filter((f) => f.status === 'uploading')
  );

  const completedFiles: ComputedRef<FileTask[]> = computed(() =>
    files.value.filter((f) => f.status === 'completed')
  );

  const failedFiles: ComputedRef<FileTask[]> = computed(() =>
    files.value.filter((f) => f.status === 'error')
  );

  const totalSize: ComputedRef<number> = computed(() =>
    files.value.reduce((sum, f) => sum + f.size, 0)
  );

  const uploadedSize: ComputedRef<number> = computed(() =>
    files.value.reduce((sum, f) => sum + (f.uploadedBytes || 0), 0)
  );

  const successRate: ComputedRef<number> = computed(() => {
    if (files.value.length === 0) return 0;
    return (completedFiles.value.length / files.value.length) * 100;
  });

  // Actions
  const addFiles = (newFiles: File[]) => {
    uploadComposable.handleFileSelect({
      target: { files: newFiles as unknown as FileList },
    } as unknown as Event);
    files.value = uploadComposable.files.value;
  };

  const uploadFile = async (file: File) => {
    await uploadComposable.uploadFile(file);
    files.value = uploadComposable.files.value;
  };

  const uploadAllFiles = async () => {
    await uploadComposable.uploadAllFiles();
    files.value = uploadComposable.files.value;
  };

  const cancelUpload = (fileId: string) => {
    uploadComposable.cancelUpload(fileId);
    files.value = uploadComposable.files.value;
  };

  const retryUpload = async (fileId: string) => {
    await uploadComposable.retryUpload(fileId);
    files.value = uploadComposable.files.value;
  };

  const clearCompleted = () => {
    uploadComposable.clearCompleted();
    files.value = uploadComposable.files.value;
  };

  const clearAll = () => {
    uploadComposable.clearAll();
    files.value = uploadComposable.files.value;
  };

  const updateProgress = () => {
    totalProgress.value = uploadComposable.totalProgress.value;
  };

  const getFileById = (fileId: string): FileTask | undefined => {
    return files.value.find((f) => f.id === fileId);
  };

  const getFilesByStatus = (status: UploadStatus): FileTask[] => {
    return files.value.filter((f) => f.status === status);
  };

  const getUploadStats = () => {
    return {
      total: files.value.length,
      pending: pendingFiles.value.length,
      uploading: uploadingFiles.value.length,
      completed: completedFiles.value.length,
      failed: failedFiles.value.length,
      cancelled: files.value.filter((f) => f.status === 'cancelled').length,
      totalSize: totalSize.value,
      uploadedSize: uploadedSize.value,
      progress: totalProgress.value,
      successRate: successRate.value,
    };
  };

  // 重置状态
  const reset = () => {
    files.value = [];
    isUploading.value = false;
    totalProgress.value = 0;
    selectedFiles.value = [];
  };

  return {
    // 状态
    files,
    isUploading,
    totalProgress,
    selectedFiles,

    // 计算属性
    pendingFiles,
    uploadingFiles,
    completedFiles,
    failedFiles,
    totalSize,
    uploadedSize,
    successRate,

    // Actions
    addFiles,
    uploadFile,
    uploadAllFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
    updateProgress,
    getFileById,
    getFilesByStatus,
    getUploadStats,
    reset,
  };
});
