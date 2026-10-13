import { createHash } from 'node:crypto';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { OrientationMediaKind } from '@prisma/client';
import { orientationMediaAssetSchema, type OrientationMediaAssetDto } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const ORIENTATION_SLUG = 'ielts-orientation';
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const ALLOWED_MEDIA: Readonly<Record<OrientationMediaKind, ReadonlySet<string>>> = {
  AUDIO: new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-wav']),
  IMAGE: new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']),
};

export interface OrientationMediaUpload {
  readonly body: Buffer;
  readonly fileName: string;
  readonly mimeType: string;
}

@Injectable()
export class OrientationMediaService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async upload(
    actorId: string,
    kind: OrientationMediaKind,
    upload: OrientationMediaUpload,
  ): Promise<OrientationMediaAssetDto> {
    if (upload.body.length === 0 || upload.body.length > MAX_MEDIA_BYTES) {
      throw new BadRequestException('Orientation media must be between 1 byte and 20 MB.');
    }
    if (!ALLOWED_MEDIA[kind].has(upload.mimeType)) {
      throw new BadRequestException(`Unsupported ${kind.toLowerCase()} media type.`);
    }
    const orientation = await this.database.ieltsOrientation.findUnique({ where: { slug: ORIENTATION_SLUG } });
    if (!orientation) throw new NotFoundException('IELTS orientation has not been configured.');
    const stored = await this.storage.put({
      body: upload.body,
      contentType: upload.mimeType,
      prefix: 'ielts-orientation',
    });
    try {
      const asset = await this.database.orientationMediaAsset.create({ data: {
        orientationId: orientation.id,
        kind,
        fileName: upload.fileName.slice(0, 255) || 'orientation-media',
        mimeType: upload.mimeType,
        byteSize: stored.size,
        checksum: createHash('sha256').update(upload.body).digest('hex'),
        storageKey: stored.key,
        createdById: actorId,
      } });
      return this.toDto(asset);
    } catch (error) {
      await this.storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async get(assetId: string): Promise<{ body: Buffer; mimeType: string }> {
    const asset = await this.database.orientationMediaAsset.findFirst({
      where: { id: assetId, orientation: { slug: ORIENTATION_SLUG } },
    });
    if (!asset) throw new NotFoundException('Orientation media not found.');
    return { body: await this.storage.read(asset.storageKey), mimeType: asset.mimeType };
  }

  private toDto(asset: {
    id: string; kind: OrientationMediaKind; fileName: string; mimeType: string;
    byteSize: number; createdAt: Date;
  }): OrientationMediaAssetDto {
    return orientationMediaAssetSchema.parse({
      id: asset.id,
      kind: asset.kind,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      createdAt: asset.createdAt.toISOString(),
      contentUrl: `/api/v1/admin/ielts-orientation/media/${asset.id}/content`,
    });
  }
}
