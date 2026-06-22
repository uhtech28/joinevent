import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { KycService } from './kyc.service';
import { submitKycSchema } from './dto/kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const DOC_KINDS = ['pan', 'aadhaar', 'gst', 'rwa_permission', 'org_proof', 'other'] as const;

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  // POST /kyc/submit — multipart/form-data
  // Form fields: businessProfileId, companyName?, ...
  // Files: field name "files" (multiple). Optional sibling field "kinds" is a
  // JSON array aligned to the files. Defaults all to 'other'.
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  @UseInterceptors(FilesInterceptor('files', 12, { limits: { fileSize: 6 * 1024 * 1024 } }))
  async submit(
    @CurrentUser() user: { id: string },
    @Body() raw: Record<string, string>,
    @UploadedFiles() rawFiles: Express.Multer.File[] = [],
  ) {
    let parsedStructured: Record<string, unknown> = {};
    try {
      parsedStructured = JSON.parse(raw.json ?? '{}');
    } catch {
      throw new BadRequestException({ code: 'invalid_json' });
    }
    const parsed = submitKycSchema.safeParse(parsedStructured);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }

    let kinds: string[] = [];
    try {
      kinds = JSON.parse(raw.kinds ?? '[]');
    } catch {
      kinds = [];
    }
    const files = rawFiles.map((f, i) => ({
      kind: DOC_KINDS.includes(kinds[i] as (typeof DOC_KINDS)[number])
        ? kinds[i]
        : 'other',
      original: f,
    }));

    return this.kyc.submit(user.id, parsed.data, files);
  }

  // GET /kyc/mine — fetch the user's latest KYC submission
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.kyc.myLatest(user.id);
  }
}

// Separate admin controller for KYC viewer + file download
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/kyc')
export class AdminKycController {
  constructor(private readonly kyc: KycService) {}

  @Get('profile/:profileId')
  detail(@Param('profileId') profileId: string) {
    return this.kyc.adminGetForProfile(profileId);
  }

  @Get('docs/:docId')
  async download(@Param('docId') docId: string, @Res() res: Response) {
    const { path, doc } = await this.kyc.streamDocument(docId);
    res.setHeader('Content-Type', doc.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    res.sendFile(path);
  }
}
