import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';

// Allowed image types
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'businesses');
if (!existsSync(uploadsDir)) {
  console.log(`📁 Creating uploads directory: ${uploadsDir}`);
  mkdirSync(uploadsDir, { recursive: true });
}

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      // Use absolute path to ensure it works
      callback(null, uploadsDir);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `business-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
        ),
        false
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: maxFileSize,
  },
};
