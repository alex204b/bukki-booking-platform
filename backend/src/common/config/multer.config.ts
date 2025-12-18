import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

// Allowed image types
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/businesses',
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
