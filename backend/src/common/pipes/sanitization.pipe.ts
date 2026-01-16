import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SanitizationUtil } from '../utils/sanitization.util';

/**
 * Global Sanitization Pipe
 *
 * Automatically sanitizes all incoming request data
 * Apply this globally in main.ts
 *
 * Usage in main.ts:
 * app.useGlobalPipes(new SanitizationPipe());
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly sanitizeHtmlFields = [
    'description',
    'bio',
    'about',
    'content',
    'message',
    'comment',
    'review',
    'notes',
  ];

  private readonly urlFields = ['website', 'url', 'link', 'avatar', 'image'];

  private readonly emailFields = ['email'];

  private readonly phoneFields = ['phone', 'phoneNumber', 'mobile'];

  private readonly filePathFields = ['path', 'filePath', 'file'];

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value) {
      return value;
    }

    // Only sanitize body and query parameters
    if (metadata.type === 'body' || metadata.type === 'query') {
      return this.sanitizeValue(value);
    }

    return value;
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings
    if (typeof value === 'string') {
      return SanitizationUtil.sanitizeString(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      const sanitized: any = {};

      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          const fieldValue = value[key];

          // Skip if null or undefined
          if (fieldValue === null || fieldValue === undefined) {
            sanitized[key] = fieldValue;
            continue;
          }

          // Sanitize based on field name
          try {
            if (this.emailFields.includes(key)) {
              sanitized[key] = SanitizationUtil.sanitizeEmail(fieldValue);
            } else if (this.phoneFields.includes(key)) {
              sanitized[key] = SanitizationUtil.sanitizePhone(fieldValue);
            } else if (this.urlFields.includes(key)) {
              sanitized[key] = SanitizationUtil.sanitizeUrl(fieldValue);
            } else if (this.filePathFields.includes(key)) {
              sanitized[key] = SanitizationUtil.sanitizeFilePath(fieldValue);
            } else if (this.sanitizeHtmlFields.includes(key)) {
              sanitized[key] = SanitizationUtil.escapeHtml(fieldValue);
            } else if (key === 'filename') {
              sanitized[key] = SanitizationUtil.sanitizeFilename(fieldValue);
            } else {
              // Recursively sanitize nested objects
              sanitized[key] = this.sanitizeValue(fieldValue);
            }
          } catch (error) {
            throw new BadRequestException(`Invalid ${key}: ${error.message}`);
          }
        }
      }

      return sanitized;
    }

    return value;
  }
}
