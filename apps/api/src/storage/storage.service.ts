// Pluggable file storage. Local disk in dev; Cloudflare R2 / AWS S3 in prod.
// One interface — drop-in switch via STORAGE_DRIVER env var.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';
import { loadEnv } from '../env';

export interface PutResult {
  key: string;
  url: string;
  bytes: number;
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
  get(key: string): Promise<Buffer>;
  url(key: string): string;
  delete(key: string): Promise<void>;
}

@Injectable()
export class StorageService implements OnModuleInit, StorageDriver {
  private readonly log = new Logger(StorageService.name);
  private driver!: StorageDriver;

  async onModuleInit() {
    const env = loadEnv();
    if (env.STORAGE_DRIVER === 'local') {
      this.driver = new LocalDriver(env.STORAGE_LOCAL_DIR);
      this.log.log(`Storage: local (${env.STORAGE_LOCAL_DIR})`);
      return;
    }
    if (env.STORAGE_DRIVER === 'r2' || env.STORAGE_DRIVER === 's3') {
      this.driver = await S3Driver.create(env.STORAGE_DRIVER);
      this.log.log(`Storage: ${env.STORAGE_DRIVER} (${env.STORAGE_R2_BUCKET})`);
      return;
    }
    throw new Error(`Unknown STORAGE_DRIVER`);
  }

  /** Generate a content-addressable key under a namespace, e.g. 'kyc/abc/xyz.pdf'. */
  generateKey(namespace: string, ext: string): string {
    const id = randomBytes(16).toString('hex');
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    return `${namespace}/${id.slice(0, 2)}/${id}${safeExt ? '.' + safeExt : ''}`;
  }

  put = (k: string, b: Buffer, ct: string) => this.driver.put(k, b, ct);
  get = (k: string) => this.driver.get(k);
  url = (k: string) => this.driver.url(k);
  delete = (k: string) => this.driver.delete(k);
}

// ------------------------------------------------------------
// Local-disk driver (dev only)
// ------------------------------------------------------------
class LocalDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  private p(key: string) {
    return join(this.root, key);
  }

  async put(key: string, body: Buffer, _ct: string): Promise<PutResult> {
    const full = this.p(key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key, url: this.url(key), bytes: body.length };
  }

  get(key: string) {
    return fs.readFile(this.p(key));
  }

  url(key: string) {
    // Keep slashes as path separators so the wildcard route matches naturally.
    // Each path segment is URL-encoded individually to escape spaces / unicode.
    const safe = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `/api/v1/storage/${safe}`;
  }

  async delete(key: string) {
    try {
      await fs.unlink(this.p(key));
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------
// S3 / R2 driver — uses @aws-sdk/client-s3 lazily so dev runs without it.
// R2 = S3-compatible endpoint, just a different endpoint URL + bucket region.
// ------------------------------------------------------------
class S3Driver implements StorageDriver {
  private constructor(
    private readonly client: any, // S3Client
    private readonly bucket: string,
    private readonly publicBase: string,
  ) {}

  static async create(kind: 'r2' | 's3'): Promise<S3Driver> {
    const env = loadEnv();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client } = require('@aws-sdk/client-s3');
    if (!env.STORAGE_R2_BUCKET || !env.STORAGE_R2_ACCESS_KEY || !env.STORAGE_R2_SECRET_KEY) {
      throw new Error(`STORAGE_${kind.toUpperCase()} requires bucket + access keys`);
    }
    const endpoint =
      kind === 'r2'
        ? `https://${env.STORAGE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined;
    const client = new S3Client({
      region: kind === 'r2' ? 'auto' : 'auto',
      endpoint,
      credentials: {
        accessKeyId: env.STORAGE_R2_ACCESS_KEY,
        secretAccessKey: env.STORAGE_R2_SECRET_KEY,
      },
    });
    const publicBase = env.STORAGE_R2_PUBLIC_URL ?? '';
    return new S3Driver(client, env.STORAGE_R2_BUCKET, publicBase);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<PutResult> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return { key, url: this.url(key), bytes: body.length };
  }

  async get(key: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
    return Buffer.concat(chunks);
  }

  url(key: string) {
    return this.publicBase ? `${this.publicBase}/${key}` : `s3://${this.bucket}/${key}`;
  }

  async delete(key: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
