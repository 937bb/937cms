import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RuntimeConfigService } from '../../../config/runtime-config.service';
import { AdminGuard } from '../auth/admin.guard';
import { SystemSettingsService } from '../system/system-settings.service';

function safeDirName(input: unknown) {
  const raw = String(input || '').trim();
  if (!raw) return 'misc';
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 32);
  return cleaned || 'misc';
}

function safeExt(name: string) {
  const ext = path.extname(name || '').toLowerCase();
  if (!ext) return '';
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
}

function extFromMime(mime: string) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  if (m === 'image/svg+xml') return '.svg';
  if (m === 'image/x-icon' || m === 'image/vnd.microsoft.icon') return '.ico';
  return '';
}

function isAllowedImage(mime: string, ext: string, opts?: { allowSvg?: boolean }) {
  const m = String(mime || '').toLowerCase();
  const e = String(ext || '').toLowerCase();
  if (!m.startsWith('image/')) return false;
  const allowSvg = !!opts?.allowSvg;
  const exts = allowSvg
    ? ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico']
    : ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'];
  return exts.includes(e) || e === '';
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/upload')
export class AdminUploadController {
  constructor(
    private readonly cfg: RuntimeConfigService,
    private readonly settings: SystemSettingsService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Note: memoryStorage buffers file into memory; keep this conservative.
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async upload(@UploadedFile() file?: any, @Body('dir') dir?: string, @Body('mode') mode?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('file required');
    const subdir = safeDirName(dir);
    const uploadMode = String(mode || 'image').toLowerCase();
    const uploadCfg = await this.settings.getUpload();
    const maxMb = Math.max(1, Math.min(20, Number(uploadCfg?.maxMb || 10)));
    const maxBytes = maxMb * 1024 * 1024;
    if (Number(file.size || 0) > maxBytes) {
      throw new BadRequestException(`file too large (max ${maxMb}MB)`);
    }

    if (uploadMode === 'any' && Number(uploadCfg?.allowAny || 0) !== 1) {
      throw new BadRequestException('any-file upload disabled');
    }

    let ext = safeExt(file.originalname);
    if (!ext) ext = extFromMime(file.mimetype);

    if (uploadMode !== 'any' && !isAllowedImage(file.mimetype, ext, { allowSvg: Number(uploadCfg?.allowSvg || 0) === 1 })) {
      throw new BadRequestException('only image upload is allowed');
    }

    const filename = `${crypto.randomUUID()}${ext}`;

    const dataDir = path.dirname(this.cfg.getConfigPath());
    const uploadDir = path.join(dataDir, 'uploads', subdir);
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), file.buffer);

    return {
      ok: true,
      url: `/uploads/${subdir}/${filename}`,
      filename,
      originalName: file.originalname,
      size: file.size,
      mime: file.mimetype,
    };
  }
}
