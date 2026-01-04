<template>
  <div class="upload-icon">
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  </div>
</template>

<script setup lang="ts">
// 上传图标组件
// 用于文件上传界面的图标展示
</script>

<style scoped>
.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #666;
  transition: all 0.3s ease;
}

.upload-area:hover .upload-icon {
  color: #1890ff;
  transform: scale(1.1);
}

.drag-over .upload-icon {
  color: #1890ff;
  transform: scale(1.2);
}

.upload-icon svg {
  display: block;
}
</style>
