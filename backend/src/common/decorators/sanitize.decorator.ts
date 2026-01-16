import { Transform } from 'class-transformer';
import { SanitizationUtil } from '../utils/sanitization.util';

/**
 * Custom decorators for automatic sanitization in DTOs
 *
 * Usage in DTOs:
 * class CreateUserDto {
 *   @SanitizeString()
 *   @IsString()
 *   firstName: string;
 *
 *   @SanitizeEmail()
 *   @IsEmail()
 *   email: string;
 * }
 */

/**
 * Sanitize string input
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.sanitizeString(value);
    }
    return value;
  });
}

/**
 * Sanitize and escape HTML
 */
export function SanitizeHtml() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.escapeHtml(value);
    }
    return value;
  });
}

/**
 * Sanitize email
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return SanitizationUtil.sanitizeEmail(value);
      } catch (error) {
        return value; // Let validation handle the error
      }
    }
    return value;
  });
}

/**
 * Sanitize phone number
 */
export function SanitizePhone() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.sanitizePhone(value);
    }
    return value;
  });
}

/**
 * Sanitize URL
 */
export function SanitizeUrl() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return SanitizationUtil.sanitizeUrl(value);
      } catch (error) {
        return value; // Let validation handle the error
      }
    }
    return value;
  });
}

/**
 * Sanitize filename
 */
export function SanitizeFilename() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.sanitizeFilename(value);
    }
    return value;
  });
}

/**
 * Sanitize integer
 */
export function SanitizeInteger() {
  return Transform(({ value }) => {
    return SanitizationUtil.sanitizeInteger(value);
  });
}

/**
 * Sanitize number
 */
export function SanitizeNumber() {
  return Transform(({ value }) => {
    return SanitizationUtil.sanitizeNumber(value);
  });
}

/**
 * Sanitize boolean
 */
export function SanitizeBoolean() {
  return Transform(({ value }) => {
    return SanitizationUtil.sanitizeBoolean(value);
  });
}

/**
 * Remove SQL injection patterns
 */
export function RemoveSqlPatterns() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.removeSqlInjectionPatterns(value);
    }
    return value;
  });
}

/**
 * Sanitize UUID
 */
export function SanitizeUuid() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return SanitizationUtil.sanitizeUuid(value);
      } catch (error) {
        return value; // Let validation handle the error
      }
    }
    return value;
  });
}

/**
 * Limit string length
 */
export function LimitLength(maxLength: number) {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return SanitizationUtil.limitLength(value, maxLength);
    }
    return value;
  });
}

/**
 * Sanitize array of strings
 */
export function SanitizeStringArray() {
  return Transform(({ value }) => {
    if (Array.isArray(value)) {
      return SanitizationUtil.sanitizeStringArray(value);
    }
    return value;
  });
}
