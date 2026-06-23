// Pluggable file storage. Local disk in dev; Cloudflare R2 / AWS S3 / Cloudinary
// in prod. One interface — drop-in switch via STORAGE_DRIVER env var.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { randomBytes, createHash } from 'crypto';
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
    if (env.STORAGE_DRIVER === 'cloudinary') {
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        throw new Error(
          'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
        );
      }
      this.driver = new CloudinaryDriver(
        env.CLOUDINARY_CLOUD_NAME,
        env.CLOUDINARY_API_KEY,
        env.CLOUDINARY_API_SECRET,
      );
      this.log.log(`Storage: cloudinary (${env.CLOUDINARY_CLOUD_NAME})`);
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

// ------------------------------------------------------------
// Cloudinary driver — uses Cloudinary's signed upload REST API directly.
// No npm SDK dependency: we sign with built-in crypto and POST via fetch.
//
// Cost: free tier ships with 25 monthly "credits" (≈25GB storage + bandwidth
// + transformations combined). Plenty for client preview and small launches.
//
// Setup:
//   1. Sign up at https://cloudinary.com (no credit card needed).
//   2. Dashboard shows cloud_name + api_key + api_secret.
//   3. Set on Render API service env:
//        STORAGE_DRIVER=cloudinary
//        CLOUDINARY_CLOUD_NAME=<your-cloud-name>
//        CLOUDINARY_API_KEY=<your-api-key>
//        CLOUDINARY_API_SECRET=<your-api-secret>
//   4. Redeploy. New uploads land on Cloudinary's CDN and persist forever.
// ------------------------------------------------------------
class CloudinaryDriver implements StorageDriver {
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async put(key: string, body: Buffer, contentType: string): Promise<PutResult> {
    // Cloudinary uses its own public_id (we map our `key` to that). Strip the
    // file extension because Cloudinary derives it from the upload payload.
    const publicId = key.replace(/\.[a-zA-Z0-9]+$/, '');
    const timestamp = Math.floor(Date.now() / 1000);

    // Build the signature: sort params alphabetically, join as k=v&k=v,
    // append api_secret, sha1.
    const paramsToSign: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
    };
    const signature = createHash('sha1')
      .update(
        Object.keys(paramsToSign)
          .sort()
          .map((k) => `${k}=${paramsToSign[k]}`)
          .join('&') + this.apiSecret,
      )
      .digest('hex');

    // Build multipart body. Cloudinary accepts the file as a Blob in the
    // 'file' field. Node 20's global fetch + FormData handle this natively.
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(body)], { type: contentType }));
    form.set('public_id', publicId);
    form.set('api_key', this.apiKey);
    form.set('timestamp', String(timestamp));
    form.set('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`,
      { method: 'POST', body: form },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { secure_url: string; bytes: number; public_id: string };
    return { key: json.public_id, url: json.secure_url, bytes: json.bytes };
  }

  async get(_key: string): Promise<Buffer> {
    // Cloudinary serves files directly from its CDN, so the API never needs
    // to proxy a GET. This method exists only for the StorageDriver contract.
    throw new Error(
      'Cloudinary URLs are public — fetch directly from the secure_url instead of via the storage service.',
    );
  }

  url(publicId: string): string {
    // Plain delivery URL. New uploads return the full secure_url from put(),
    // so this is only used if something stores just the public_id.
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
  }

  async delete(publicId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`)
      .digest('hex');
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('api_key', this.apiKey);
    form.set('timestamp', String(timestamp));
    form.set('signature', signature);
    await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      { method: 'POST', body: form },
    ).catch(() => {
      /* best-effort */
    });
  }
}
