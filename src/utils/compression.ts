// src/utils/compression.ts
import pako from 'pako';

// 压缩分片数据
export function compressChunk(chunk: Uint8Array): Uint8Array {
  return pako.gzip(chunk);
}

// 解压分片数据
export function decompressChunk(chunk: Uint8Array): Uint8Array {
  return pako.ungzip(chunk);
}
