import { SanitizationUtil } from './sanitization.util';

describe('SanitizationUtil', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(SanitizationUtil.sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(SanitizationUtil.sanitizeString('hello\0world')).toBe('helloworld');
    });

    it('should remove control characters', () => {
      expect(SanitizationUtil.sanitizeString('hello\x01world')).toBe('helloworld');
    });

    it('should limit consecutive whitespace', () => {
      expect(SanitizationUtil.sanitizeString('hello    world')).toBe(
        'hello world',
      );
    });

    it('should return empty string for non-string input', () => {
      expect(SanitizationUtil.sanitizeString(null as any)).toBe('');
      expect(SanitizationUtil.sanitizeString(undefined as any)).toBe('');
      expect(SanitizationUtil.sanitizeString(123 as any)).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(SanitizationUtil.escapeHtml(input)).toBe(expected);
    });

    it('should escape ampersands', () => {
      expect(SanitizationUtil.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(SanitizationUtil.escapeHtml('He said "Hello"')).toBe(
        'He said &quot;Hello&quot;',
      );
      expect(SanitizationUtil.escapeHtml("It's nice")).toBe(
        'It&#x27;s nice',
      );
    });

    it('should return empty string for non-string input', () => {
      expect(SanitizationUtil.escapeHtml(null as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      expect(SanitizationUtil.sanitizeEmail('  Test@Example.COM  ')).toBe(
        'test@example.com',
      );
    });

    it('should allow valid special characters', () => {
      expect(SanitizationUtil.sanitizeEmail('user+tag@example.com')).toBe(
        'user+tag@example.com',
      );
      expect(SanitizationUtil.sanitizeEmail('user.name@example.com')).toBe(
        'user.name@example.com',
      );
    });

    it('should throw error for invalid email', () => {
      expect(() => SanitizationUtil.sanitizeEmail('invalid email')).toThrow(
        'Invalid email format',
      );
      expect(() => SanitizationUtil.sanitizeEmail('test@')).toThrow(
        'Invalid email format',
      );
      expect(() => SanitizationUtil.sanitizeEmail('@example.com')).toThrow(
        'Invalid email format',
      );
    });

    it('should remove dangerous characters', () => {
      expect(SanitizationUtil.sanitizeEmail('test<script>@example.com')).toBe(
        'testscript@example.com',
      );
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-numeric characters', () => {
      expect(SanitizationUtil.sanitizePhone('+1 (555) 123-4567')).toBe(
        '+15551234567',
      );
    });

    it('should preserve + at beginning', () => {
      expect(SanitizationUtil.sanitizePhone('+447700900123')).toBe(
        '+447700900123',
      );
    });

    it('should remove + in middle', () => {
      expect(SanitizationUtil.sanitizePhone('555+123+4567')).toBe(
        '5551234567',
      );
    });

    it('should handle phone without +', () => {
      expect(SanitizationUtil.sanitizePhone('5551234567')).toBe('5551234567');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
      const url = 'http://example.com';
      expect(SanitizationUtil.sanitizeUrl(url)).toBe(url);
    });

    it('should allow valid HTTPS URLs', () => {
      const url = 'https://example.com/path?query=value';
      expect(SanitizationUtil.sanitizeUrl(url)).toBe(url);
    });

    it('should allow mailto URLs', () => {
      const url = 'mailto:test@example.com';
      expect(SanitizationUtil.sanitizeUrl(url)).toBe(url);
    });

    it('should throw error for javascript: protocol', () => {
      expect(() =>
        SanitizationUtil.sanitizeUrl('javascript:alert("XSS")'),
      ).toThrow();
    });

    it('should throw error for data: protocol', () => {
      expect(() =>
        SanitizationUtil.sanitizeUrl('data:text/html,<script>alert(1)</script>'),
      ).toThrow();
    });

    it('should throw error for invalid URL', () => {
      expect(() => SanitizationUtil.sanitizeUrl('not a url')).toThrow(
        'Invalid URL format',
      );
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove path traversal attempts', () => {
      expect(SanitizationUtil.sanitizeFilePath('../../etc/passwd')).toBe(
        'etc/passwd',
      );
    });

    it('should normalize slashes', () => {
      expect(SanitizationUtil.sanitizeFilePath('path\\to\\file')).toBe(
        'path/to/file',
      );
      expect(SanitizationUtil.sanitizeFilePath('path///file')).toBe(
        'path/file',
      );
    });

    it('should remove leading slashes', () => {
      expect(SanitizationUtil.sanitizeFilePath('/path/to/file')).toBe(
        'path/to/file',
      );
    });

    it('should remove null bytes', () => {
      expect(SanitizationUtil.sanitizeFilePath('file\0name')).toBe('filename');
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize special characters', () => {
      expect(SanitizationUtil.sanitizeFilename('file name!@#$.txt')).toBe(
        'file_name_.txt',
      );
    });

    it('should preserve extension', () => {
      expect(SanitizationUtil.sanitizeFilename('document.pdf')).toBe(
        'document.pdf',
      );
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(250) + '.txt';
      const result = SanitizationUtil.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(204); // 200 + '.txt'
    });

    it('should handle files without extension', () => {
      expect(SanitizationUtil.sanitizeFilename('README')).toBe('README');
    });
  });

  describe('sanitizeNumber', () => {
    it('should parse valid numbers', () => {
      expect(SanitizationUtil.sanitizeNumber('123')).toBe(123);
      expect(SanitizationUtil.sanitizeNumber('123.45')).toBe(123.45);
      expect(SanitizationUtil.sanitizeNumber(-50)).toBe(-50);
    });

    it('should return null for invalid numbers', () => {
      expect(SanitizationUtil.sanitizeNumber('abc')).toBeNull();
      expect(SanitizationUtil.sanitizeNumber(NaN)).toBeNull();
      expect(SanitizationUtil.sanitizeNumber(Infinity)).toBeNull();
    });
  });

  describe('sanitizeInteger', () => {
    it('should parse valid integers', () => {
      expect(SanitizationUtil.sanitizeInteger('123')).toBe(123);
      expect(SanitizationUtil.sanitizeInteger(456)).toBe(456);
    });

    it('should return null for floats', () => {
      expect(SanitizationUtil.sanitizeInteger('123.45')).toBeNull();
      expect(SanitizationUtil.sanitizeInteger(123.45)).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(SanitizationUtil.sanitizeInteger('abc')).toBeNull();
    });
  });

  describe('sanitizeBoolean', () => {
    it('should handle boolean input', () => {
      expect(SanitizationUtil.sanitizeBoolean(true)).toBe(true);
      expect(SanitizationUtil.sanitizeBoolean(false)).toBe(false);
    });

    it('should parse string input', () => {
      expect(SanitizationUtil.sanitizeBoolean('true')).toBe(true);
      expect(SanitizationUtil.sanitizeBoolean('TRUE')).toBe(true);
      expect(SanitizationUtil.sanitizeBoolean('1')).toBe(true);
      expect(SanitizationUtil.sanitizeBoolean('false')).toBe(false);
      expect(SanitizationUtil.sanitizeBoolean('0')).toBe(false);
    });

    it('should parse number input', () => {
      expect(SanitizationUtil.sanitizeBoolean(1)).toBe(true);
      expect(SanitizationUtil.sanitizeBoolean(0)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '  John  ',
        email: '  test@EXAMPLE.com  ',
        nested: {
          value: '  spaces  ',
        },
      };

      const result = SanitizationUtil.sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.nested.value).toBe('spaces');
    });

    it('should sanitize arrays', () => {
      const input = ['  hello  ', '  world  '];
      const result = SanitizationUtil.sanitizeObject(input);
      expect(result).toEqual(['hello', 'world']);
    });

    it('should preserve non-string values', () => {
      const input = {
        string: '  text  ',
        number: 123,
        boolean: true,
        null: null,
      };

      const result = SanitizationUtil.sanitizeObject(input);
      expect(result.string).toBe('text');
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.null).toBeNull();
    });
  });

  describe('removeSqlInjectionPatterns', () => {
    it('should remove SQL keywords', () => {
      const result = SanitizationUtil.removeSqlInjectionPatterns("'; DROP TABLE users; --");
      // Should remove dangerous SQL keywords, quotes, comments, and semicolons
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('--');
      expect(result).not.toContain(';');
      expect(result).not.toContain("'");
    });

    it('should remove SQL comments', () => {
      const result1 = SanitizationUtil.removeSqlInjectionPatterns('test -- comment');
      expect(result1).not.toContain('--');

      const result2 = SanitizationUtil.removeSqlInjectionPatterns('test /* comment */');
      expect(result2).not.toContain('/*');
      expect(result2).not.toContain('*/');
    });

    it('should preserve normal text', () => {
      expect(SanitizationUtil.removeSqlInjectionPatterns('Hello World')).toBe(
        'Hello World',
      );
    });
  });

  describe('removeNoSqlInjectionPatterns', () => {
    it('should remove MongoDB operators', () => {
      expect(SanitizationUtil.removeNoSqlInjectionPatterns('$where')).toBe('');
      expect(SanitizationUtil.removeNoSqlInjectionPatterns('$ne')).toBe('');
      expect(SanitizationUtil.removeNoSqlInjectionPatterns('test$or')).toBe('test');
    });

    it('should preserve normal text', () => {
      expect(SanitizationUtil.removeNoSqlInjectionPatterns('normal text')).toBe(
        'normal text',
      );
    });
  });

  describe('sanitizeUuid', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(SanitizationUtil.sanitizeUuid(uuid)).toBe(uuid);
    });

    it('should normalize UUID case', () => {
      const uuid = '123E4567-E89B-12D3-A456-426614174000';
      expect(SanitizationUtil.sanitizeUuid(uuid)).toBe(uuid.toLowerCase());
    });

    it('should throw error for invalid UUID', () => {
      expect(() => SanitizationUtil.sanitizeUuid('not-a-uuid')).toThrow(
        'Invalid UUID format',
      );
      expect(() => SanitizationUtil.sanitizeUuid('12345')).toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('sanitizeDate', () => {
    it('should parse valid date strings', () => {
      const date = '2024-01-15T10:30:00.000Z';
      expect(SanitizationUtil.sanitizeDate(date)).toBe(date);
    });

    it('should convert to ISO string', () => {
      const result = SanitizationUtil.sanitizeDate('2024-01-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should throw error for invalid date', () => {
      expect(() => SanitizationUtil.sanitizeDate('not a date')).toThrow(
        'Invalid date format',
      );
    });
  });

  describe('sanitizeStringArray', () => {
    it('should sanitize array of strings', () => {
      const input = ['  hello  ', '  world  ', 123, null, '  test  '];
      const result = SanitizationUtil.sanitizeStringArray(input as any);
      expect(result).toEqual(['hello', 'world', 'test']);
    });

    it('should return empty array for non-array input', () => {
      expect(SanitizationUtil.sanitizeStringArray('not an array' as any)).toEqual(
        [],
      );
    });

    it('should filter out empty strings', () => {
      const input = ['hello', '', '  ', 'world'];
      const result = SanitizationUtil.sanitizeStringArray(input);
      expect(result).toEqual(['hello', 'world']);
    });
  });

  describe('limitLength', () => {
    it('should limit string length', () => {
      const input = 'This is a very long string';
      const result = SanitizationUtil.limitLength(input, 10);
      expect(result).toBe('This is...');
      expect(result.length).toBe(10);
    });

    it('should not modify strings shorter than limit', () => {
      const input = 'Short';
      expect(SanitizationUtil.limitLength(input, 10)).toBe('Short');
    });
  });

  describe('sanitizeJson', () => {
    it('should parse and sanitize valid JSON', () => {
      const json = '{"name": "  John  ", "age": 30}';
      const result = SanitizationUtil.sanitizeJson(json);
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => SanitizationUtil.sanitizeJson('not json')).toThrow(
        'Invalid JSON format',
      );
    });
  });

  describe('removeScriptTags', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const result = SanitizationUtil.removeScriptTags(input);
      expect(result).toBe('<p>Hello</p><p>World</p>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = SanitizationUtil.removeScriptTags(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = SanitizationUtil.removeScriptTags(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data:text/html protocol', () => {
      const input = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>';
      const result = SanitizationUtil.removeScriptTags(input);
      expect(result).not.toContain('data:text/html');
    });
  });
});
