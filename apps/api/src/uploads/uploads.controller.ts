import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ACCEPTED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

@Controller()
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  // POST /uploads/profile-image?kind=avatar|cover
  // Returns { url, key, bytes }
  @UseGuards(JwtAuthGuard)
  @Post('uploads/profile-image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }),
  )
  async profileImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ url: string; key: string; bytes: number }> {
    if (!file) {
      throw new BadRequestException({
        code: 'no_file',
        message: 'Attach a file under the "file" field.',
      });
    }
    if (!ACCEPTED.has(file.mimetype)) {
      throw new BadRequestException({
        code: 'unsupported_type',
        message: `Use JPG, PNG, WEBP or GIF. Got ${file.mimetype}.`,
      });
    }
    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!.toLowerCase()
      : file.mimetype.split('/')[1];
    const key = this.storage.generateKey('profiles', ext);
    return this.storage.put(key, file.buffer, file.mimetype);
  }

  // GET /storage/<key…> — serve a stored object from the local driver.
  // The `:rest(.*)` pattern is Express-4 / path-to-regexp v0 syntax for a
  // catch-all that captures multi-segment paths (e.g. profiles/ab/xxx.jpg).
  @Get('storage/:rest(.*)')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async serve(@Req() req: Request, @Res() res: Response) {
    // Strip everything up to and including "/storage/" — the rest is the key.
    // Use req.url (raw, encoded) and decode each segment so we tolerate both
    // legacy fully-encoded URLs and the new path-segment-encoded form.
    const m = req.url.match(/\/storage\/(.+?)(?:\?|$)/);
    const rawKey = m ? m[1] : '';
    const key = rawKey
      .split('/')
      .map((s) => decodeURIComponent(s))
      .join('/');
    if (!key) {
      res.status(404).json({ code: 'not_found' });
      return;
    }
    try {
      const buf = await this.storage.get(key);
      const ext = key.split('.').pop()?.toLowerCase();
      const ct =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
              ? 'image/gif'
              : ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.send(buf);
    } catch {
      res.status(404).json({ code: 'not_found' });
    }
  }
}
