import { BadRequestException } from '@nestjs/common';

// Use require to avoid ESM interop issues (multer.memoryStorage undefined with import)
const multer = require('multer') as typeof import('multer');

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

export const multerConfig = {
  storage: multer.memoryStorage(),
  fileFilter: (_req: any, file: Express.Multer.File, callback: (err: any, accept?: boolean) => void) => {
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
