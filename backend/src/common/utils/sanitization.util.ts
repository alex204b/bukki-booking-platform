/**
 * Input Sanitization Utilities
 *
 * This module provides comprehensive input sanitization to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection (additional layer beyond TypeORM's built-in protection)
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 * - HTML Injection
 */

export class SanitizationUtil {
  /**
   * Sanitize string input by removing potentially dangerous characters
   * Use for general text inputs (names, descriptions, etc.)
   */
  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newline and tab
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit consecutive whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Sanitize HTML content by escaping dangerous characters
   * Use for user-generated content that might be displayed in HTML
   */
  static escapeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
  }

  /**
   * Sanitize email addresses
   * Validates format and removes dangerous characters
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Remove whitespace and convert to lowercase
    let sanitized = email.trim().toLowerCase();

    // Remove any characters that aren't valid in email addresses
    sanitized = sanitized.replace(/[^a-z0-9@._+-]/gi, '');

    // Basic email format validation
    const emailRegex = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitize phone numbers
   * Removes all non-numeric characters except + at the beginning
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    let sanitized = phone.trim();

    // Allow + only at the beginning
    const hasPlus = sanitized.startsWith('+');
    sanitized = sanitized.replace(/\D/g, '');

    return hasPlus ? `+${sanitized}` : sanitized;
  }

  /**
   * Sanitize URLs to prevent javascript:, data:, and other dangerous protocols
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const sanitized = url.trim();

    // Allowed protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    try {
      const urlObj = new URL(sanitized);

      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }

      return sanitized;
    } catch (error) {
      // If URL parsing fails, it's not a valid URL
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize file paths to prevent path traversal attacks
   */
  static sanitizeFilePath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '';
    }

    // Remove path traversal attempts
    let sanitized = path
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .trim();

    // Remove leading slash to ensure relative paths
    sanitized = sanitized.replace(/^\/+/, '');

    // Remove null bytes and other dangerous characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Sanitize filenames for uploads
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    // Extract extension
    const lastDot = filename.lastIndexOf('.');
    let name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.substring(lastDot) : '';

    // Sanitize name: allow only alphanumeric, dash, underscore
    name = name
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 200); // Limit length

    // Sanitize extension: allow only alphanumeric
    const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, '').substring(0, 10);

    return `${name}${sanitizedExt}`;
  }

  /**
   * Sanitize numeric input
   * Returns null if not a valid number
   */
  static sanitizeNumber(input: any): number | null {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }
    return num;
  }

  /**
   * Sanitize integer input
   * Returns null if not a valid integer
   */
  static sanitizeInteger(input: any): number | null {
    const num = this.sanitizeNumber(input);
    if (num === null || !Number.isInteger(num)) {
      return null;
    }
    return num;
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true' || input === '1';
    }
    if (typeof input === 'number') {
      return input === 1;
    }
    return false;
  }

  /**
   * Sanitize object by recursively sanitizing all string values
   * Use for JSON payloads
   */
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitize the key as well
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Remove SQL injection patterns (additional layer of protection)
   * Note: TypeORM already protects against SQL injection via parameterized queries
   * This is an additional defensive measure
   */
  static removeSqlInjectionPatterns(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // List of dangerous SQL patterns
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
      /(--)/g,
      /(\/\*|\*\/)/g,
      /(;)/g,
      /(')/g,
      /(xp_)/gi,
      /(sp_)/gi,
    ];

    let sanitized = input;
    dangerousPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  /**
   * Remove NoSQL injection patterns
   * Protects against MongoDB-style injection attacks
   */
  static removeNoSqlInjectionPatterns(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove MongoDB operators
    const dangerousPatterns = [
      /\$where/gi,
      /\$ne/gi,
      /\$gt/gi,
      /\$lt/gi,
      /\$gte/gi,
      /\$lte/gi,
      /\$regex/gi,
      /\$or/gi,
      /\$and/gi,
      /\$not/gi,
      /\$nin/gi,
      /\$in/gi,
    ];

    let sanitized = input;
    dangerousPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate and sanitize UUID
   */
  static sanitizeUuid(uuid: string): string {
    if (!uuid || typeof uuid !== 'string') {
      throw new Error('Invalid UUID');
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const sanitized = uuid.trim().toLowerCase();

    if (!uuidRegex.test(sanitized)) {
      throw new Error('Invalid UUID format');
    }

    return sanitized;
  }

  /**
   * Sanitize date string
   * Returns ISO string or throws error
   */
  static sanitizeDate(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Invalid date');
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    return date.toISOString();
  }

  /**
   * Sanitize array of strings
   */
  static sanitizeStringArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) {
      return [];
    }

    return arr
      .filter((item) => typeof item === 'string')
      .map((item) => this.sanitizeString(item))
      .filter((item) => item.length > 0);
  }

  /**
   * Limit string length with ellipsis
   */
  static limitLength(input: string, maxLength: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    if (input.length <= maxLength) {
      return input;
    }

    return input.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate and sanitize JSON string
   */
  static sanitizeJson(jsonString: string): any {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON string');
    }

    try {
      const parsed = JSON.parse(jsonString);
      return this.sanitizeObject(parsed);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Remove script tags and event handlers from HTML
   * Use when you need to allow some HTML but prevent XSS
   */
  static removeScriptTags(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let sanitized = html;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    return sanitized;
  }
}
