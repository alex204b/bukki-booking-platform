import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

@Injectable()
export class StorageService {
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const region = this.config.get<string>('AWS_REGION') || 'auto';
    this.bucket = this.config.get<string>('AWS_S3_BUCKET') || '';
    this.publicBaseUrl = (this.config.get<string>('R2_PUBLIC_URL') || '').replace(/\/$/, '');

    if (!this.bucket || !this.publicBaseUrl) {
      throw new Error(
        'R2 storage requires AWS_S3_BUCKET and R2_PUBLIC_URL in env. ' +
          'See docs or env.example for R2 setup.'
      );
    }

    const base: AWS.S3.ClientConfiguration = {
      accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY'),
      region,
      s3ForcePathStyle: true,
    };

    if (endpoint) {
      base.endpoint = endpoint;
      base.s3BucketEndpoint = false;
    }

    this.s3 = new AWS.S3(base);
  }

  /**
   * Upload a buffer to R2 (S3-compatible). Returns full public URL.
   */
  async upload(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new Error(`Invalid mime type: ${mimeType}. Allowed: ${ALLOWED_MIME.join(', ')}`);
    }
    const ext = EXT_MAP[mimeType] || '.jpg';
    const key = `businesses/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
      .promise();

    const url = `${this.publicBaseUrl}/${key}`;
    return url;
  }

  /**
   * Delete object by full public URL. Derives key from R2_PUBLIC_URL base.
   */
  async deleteByUrl(url: string): Promise<void> {
    const base = this.publicBaseUrl + '/';
    if (!url.startsWith(base)) {
      console.warn(`[Storage] URL not under R2_PUBLIC_URL, skip delete: ${url}`);
      return;
    }
    const key = url.slice(base.length);
    if (!key || key.includes('..')) {
      console.warn(`[Storage] Invalid key derived from URL: ${url}`);
      return;
    }
    try {
      await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
    } catch (e) {
      console.error(`[Storage] Delete failed for key ${key}:`, e);
      throw e;
    }
  }
}
