import multer from 'multer';
import path from 'path';
import { join } from 'path';
import fs from 'fs-extra';
import config from '../config/index.js';

// 配置文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const UPLOAD_DIR = config.upload.tempDir;
    fs.ensureDirSync(UPLOAD_DIR);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });
