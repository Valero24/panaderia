import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MediaOwnerType,
  MediaProvider,
  MediaType,
  Prisma,
} from "@prisma/client";

import { AuditService } from "../common/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMediaDto } from "./dto/create-media.dto";
import { UpdateMediaDto } from "./dto/update-media.dto";

type AuditActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type NormalizedMedia = {
  ownerType: MediaOwnerType;
  ownerId: number;
  type: MediaType;
  url: string;
  title: string | null;
  description: string | null;
  isMain: boolean;
  sortOrder: number;
  provider: MediaProvider;
  thumbnailUrl: string | null;
  isActive: boolean;
};

const CDN_IMAGE_HOST_PARTS = [
  "cloudinary.com",
  "images.unsplash.com",
  "imgix.net",
  "cdn.",
  "supabase.co",
  "googleusercontent.com",
  "wp.com",
  "ctfassets.net",
];

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  normalizeMediaUrl(value?: string | null) {
    return String(value || "").trim();
  }

  detectMediaProvider(url: string) {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return {
        provider: MediaProvider.YOUTUBE,
        videoId: this.extractYoutubeId(parsed),
      };
    }

    if (host.includes("vimeo.com")) {
      return {
        provider: MediaProvider.VIMEO,
        videoId: this.extractVimeoId(parsed),
      };
    }

    if (/\.(mp4|webm|mov)(\?.*)?$/.test(path)) {
      return { provider: MediaProvider.DIRECT, videoId: null };
    }

    return { provider: MediaProvider.EXTERNAL, videoId: null };
  }

  buildThumbnailUrl(
    url: string,
    type: MediaType,
    manualThumbnail?: string | null
  ) {
    const cleanManual = this.normalizeMediaUrl(manualThumbnail);
    if (cleanManual) {
      this.validateMediaUrl(cleanManual, MediaType.IMAGE, { allowEmpty: false });
      return cleanManual;
    }

    if (type !== MediaType.VIDEO) return null;

    const detected = this.detectMediaProvider(url);
    if (detected.provider === MediaProvider.YOUTUBE && detected.videoId) {
      return `https://img.youtube.com/vi/${detected.videoId}/hqdefault.jpg`;
    }

    return null;
  }

  validateMediaUrl(
    value: string,
    type: MediaType,
    options: { allowEmpty?: boolean } = {}
  ) {
    const url = this.normalizeMediaUrl(value);

    if (!url) {
      if (options.allowEmpty) return "";
      throw new BadRequestException("La URL multimedia es obligatoria");
    }

    if (url.length > 500) {
      throw new BadRequestException("La URL multimedia supera 500 caracteres");
    }

    if (/^(javascript|data|file|blob):/i.test(url)) {
      throw new BadRequestException("Protocolo de URL multimedia no permitido");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException("La URL multimedia no es valida");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new BadRequestException("La URL debe iniciar con http:// o https://");
    }

    if (this.isPrivateHost(parsed.hostname)) {
      throw new BadRequestException("No se permiten URLs internas o privadas");
    }

    if (type === MediaType.IMAGE && !this.isAllowedImageUrl(parsed)) {
      throw new BadRequestException(
        "La imagen debe ser jpg, jpeg, png, webp, avif o venir de un CDN conocido"
      );
    }

    if (type === MediaType.VIDEO && !this.isAllowedVideoUrl(parsed)) {
      throw new BadRequestException(
        "El video debe ser YouTube, Vimeo o una URL directa mp4/webm/mov"
      );
    }

    return url;
  }

  async getOwnerMedia(ownerType: MediaOwnerType, ownerId: number) {
    this.assertOwner(ownerType, ownerId);

    return this.prisma.contentMedia.findMany({
      where: { ownerType, ownerId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  async create(
    ownerType: MediaOwnerType,
    ownerId: number,
    data: CreateMediaDto,
    actor?: AuditActor
  ) {
    this.assertOwner(ownerType, ownerId);
    const payload = this.normalizePayload({ ...data, ownerType, ownerId });
    const created = await this.prisma.contentMedia.create({ data: payload });

    if (created.isMain) {
      await this.setMainMedia(created.id, actor);
    } else {
      await this.ensureOwnerHasMain(ownerType, ownerId);
    }

    await this.syncOwnerMainMedia(ownerType, ownerId);
    await this.record(actor, "MEDIA_CREATED", created.id, ownerType, ownerId, {
      type: created.type,
      provider: created.provider,
    });

    return this.prisma.contentMedia.findUnique({ where: { id: created.id } });
  }

  async replaceOwnerMedia(
    ownerType: MediaOwnerType,
    ownerId: number,
    items: CreateMediaDto[],
    actor?: AuditActor
  ) {
    this.assertOwner(ownerType, ownerId);

    await this.prisma.contentMedia.updateMany({
      where: { ownerType, ownerId },
      data: { isActive: false, isMain: false },
    });

    const normalized = items
      .filter((item) => this.normalizeMediaUrl(item.url))
      .map((item, index) =>
        this.normalizePayload({
          ...item,
          ownerType,
          ownerId,
          sortOrder: item.sortOrder ?? index,
        })
      );

    if (normalized.length && !normalized.some((item) => item.isMain)) {
      normalized[0].isMain = true;
    }

    let mainSeen = false;
    const data = normalized.map((item) => {
      if (!item.isMain) return item;
      if (mainSeen) return { ...item, isMain: false };
      mainSeen = true;
      return item;
    });

    if (data.length) {
      await this.prisma.contentMedia.createMany({ data });
    }

    await this.ensureOwnerHasMain(ownerType, ownerId);
    await this.syncOwnerMainMedia(ownerType, ownerId);
    await this.record(actor, "MEDIA_IMPORT_FROM_EXCEL", undefined, ownerType, ownerId, {
      count: data.length,
    });

    return this.getOwnerMedia(ownerType, ownerId);
  }

  async update(id: number, data: UpdateMediaDto, actor?: AuditActor) {
    const existing = await this.findExisting(id);
    const patch: Prisma.ContentMediaUpdateInput = {};

    const nextType =
      (data.type || data.mediaType || existing.type) === MediaType.VIDEO
        ? MediaType.VIDEO
        : MediaType.IMAGE;
    const nextUrl =
      data.url !== undefined
        ? this.validateMediaUrl(data.url, nextType)
        : existing.url;

    if (data.url !== undefined || data.type !== undefined || data.mediaType !== undefined) {
      const detected = this.detectMediaProvider(nextUrl);
      patch.type = nextType;
      patch.url = nextUrl;
      patch.provider = detected.provider;
      patch.thumbnailUrl = this.buildThumbnailUrl(
        nextUrl,
        nextType,
        data.thumbnailUrl !== undefined ? data.thumbnailUrl : existing.thumbnailUrl
      );
    }

    if (data.thumbnailUrl !== undefined && data.url === undefined) {
      patch.thumbnailUrl = this.buildThumbnailUrl(nextUrl, nextType, data.thumbnailUrl);
    }

    if (data.title !== undefined) patch.title = this.cleanText(data.title);
    if (data.description !== undefined) {
      patch.description = this.cleanText(data.description);
    }
    if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder) || 0;
    if (data.isActive !== undefined || data.active !== undefined) {
      patch.isActive = data.isActive ?? data.active ?? true;
    }
    if (data.isMain !== undefined || data.isPrimary !== undefined) {
      patch.isMain = Boolean(data.isMain ?? data.isPrimary);
    }

    const updated = await this.prisma.contentMedia.update({
      where: { id },
      data: patch,
    });

    if (updated.isMain) {
      await this.setMainMedia(updated.id, actor);
    } else {
      await this.ensureOwnerHasMain(updated.ownerType, updated.ownerId);
    }

    await this.syncOwnerMainMedia(updated.ownerType, updated.ownerId);
    await this.record(actor, "MEDIA_UPDATED", id, updated.ownerType, updated.ownerId, {
      type: updated.type,
      provider: updated.provider,
    });

    return this.prisma.contentMedia.findUnique({ where: { id } });
  }

  async remove(id: number, actor?: AuditActor) {
    const existing = await this.findExisting(id);

    const removed = await this.prisma.contentMedia.update({
      where: { id },
      data: { isActive: false, isMain: false },
    });

    await this.ensureOwnerHasMain(existing.ownerType, existing.ownerId);
    await this.syncOwnerMainMedia(existing.ownerType, existing.ownerId);
    await this.record(actor, "MEDIA_DELETED", id, existing.ownerType, existing.ownerId);

    return removed;
  }

  async setMainMedia(id: number, actor?: AuditActor) {
    const existing = await this.findExisting(id);

    await this.prisma.contentMedia.updateMany({
      where: {
        ownerType: existing.ownerType,
        ownerId: existing.ownerId,
      },
      data: { isMain: false },
    });

    const updated = await this.prisma.contentMedia.update({
      where: { id },
      data: { isMain: true, isActive: true },
    });

    await this.syncOwnerMainMedia(existing.ownerType, existing.ownerId);
    await this.record(actor, "MEDIA_SET_MAIN", id, existing.ownerType, existing.ownerId);

    return updated;
  }

  async reorder(id: number, sortOrder: number, actor?: AuditActor) {
    const existing = await this.findExisting(id);
    const updated = await this.prisma.contentMedia.update({
      where: { id },
      data: { sortOrder: Number(sortOrder) || 0 },
    });

    await this.record(actor, "MEDIA_REORDERED", id, existing.ownerType, existing.ownerId, {
      sortOrder: updated.sortOrder,
    });

    return updated;
  }

  private normalizePayload(data: CreateMediaDto): NormalizedMedia {
    const ownerType = data.ownerType;
    const ownerId = Number(data.ownerId);
    this.assertOwner(ownerType, ownerId);
    const safeOwnerType = ownerType as MediaOwnerType;

    const type =
      (data.type || data.mediaType) === MediaType.VIDEO
        ? MediaType.VIDEO
        : MediaType.IMAGE;
    const url = this.validateMediaUrl(data.url || "", type);
    const detected = this.detectMediaProvider(url);

    return {
      ownerType: safeOwnerType,
      ownerId,
      type,
      url,
      title: this.cleanText(data.title),
      description: this.cleanText(data.description),
      isMain: Boolean(data.isMain ?? data.isPrimary),
      sortOrder: Number(data.sortOrder) || 0,
      provider: detected.provider,
      thumbnailUrl: this.buildThumbnailUrl(url, type, data.thumbnailUrl),
      isActive: data.isActive ?? data.active ?? true,
    };
  }

  private async ensureOwnerHasMain(ownerType: MediaOwnerType, ownerId: number) {
    const active = await this.getOwnerMedia(ownerType, ownerId);
    if (!active.length || active.some((item) => item.isMain)) return;

    await this.prisma.contentMedia.update({
      where: { id: active[0].id },
      data: { isMain: true },
    });
  }

  private async syncOwnerMainMedia(ownerType: MediaOwnerType, ownerId: number) {
    const active = await this.getOwnerMedia(ownerType, ownerId);
    const main = active.find((item) => item.isMain) || active[0];
    const visualUrl =
      main?.type === MediaType.VIDEO ? main.thumbnailUrl || null : main?.url || null;

    if (ownerType === MediaOwnerType.EXPERIENCE) {
      await this.prisma.experience.updateMany({
        where: { id: ownerId },
        data: { mainImage: visualUrl },
      });
      await this.syncExperienceImages(ownerId, active);
    }

    if (ownerType === MediaOwnerType.PACKAGE) {
      await this.prisma.package.updateMany({
        where: { id: ownerId },
        data: { mainImage: visualUrl },
      });
      await this.syncPackageImages(ownerId, active);
    }

    if (ownerType === MediaOwnerType.DESTINATION) {
      await this.prisma.destination.updateMany({
        where: { id: ownerId },
        data: {
          heroImage: visualUrl,
          gallery: active.length
            ? (active.map((item) => this.toGalleryItem(item)) as any)
            : Prisma.JsonNull,
        },
      });
    }

    if (ownerType === MediaOwnerType.BLOG) {
      await this.prisma.blogPost.updateMany({
        where: { id: ownerId },
        data: { coverImage: visualUrl },
      });
    }

    if (ownerType === MediaOwnerType.PROPERTY) {
      await this.syncPropertyImages(ownerId, active);
    }
  }

  private async syncPropertyImages(ownerId: number, active: any[]) {
    await this.deactivateRemovedPropertyImages(ownerId, active);

    for (const [index, item] of active.entries()) {
      const existing = await this.prisma.propertyImage.findFirst({
        where: { propertyId: ownerId, url: item.url },
      });
      const payload = {
        mediaType: item.type,
        title: item.title,
        description: item.description,
        isPrimary: item.isMain,
        active: item.isActive,
        sortOrder: item.sortOrder ?? index,
      };

      if (existing) {
        await this.prisma.propertyImage.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await this.prisma.propertyImage.create({
          data: { ...payload, url: item.url, propertyId: ownerId },
        });
      }
    }

    const main = active.find((item) => item.isMain);
    if (main) {
      await this.prisma.propertyImage.updateMany({
        where: { propertyId: ownerId, url: { not: main.url } },
        data: { isPrimary: false },
      });
    }
  }

  private async syncExperienceImages(ownerId: number, active: any[]) {
    await this.deactivateRemovedExperienceImages(ownerId, active);

    for (const [index, item] of active.entries()) {
      const existing = await this.prisma.experienceImage.findFirst({
        where: { experienceId: ownerId, url: item.url },
      });
      const payload = {
        mediaType: item.type,
        title: item.title,
        description: item.description,
        isPrimary: item.isMain,
        active: item.isActive,
        sortOrder: item.sortOrder ?? index,
      };

      if (existing) {
        await this.prisma.experienceImage.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await this.prisma.experienceImage.create({
          data: { ...payload, url: item.url, experienceId: ownerId },
        });
      }
    }

    const main = active.find((item) => item.isMain);
    if (main) {
      await this.prisma.experienceImage.updateMany({
        where: { experienceId: ownerId, url: { not: main.url } },
        data: { isPrimary: false },
      });
    }
  }

  private async syncPackageImages(ownerId: number, active: any[]) {
    await this.deactivateRemovedPackageImages(ownerId, active);

    for (const [index, item] of active.entries()) {
      const existing = await this.prisma.packageImage.findFirst({
        where: { packageId: ownerId, url: item.url },
      });
      const payload = {
        mediaType: item.type,
        title: item.title,
        description: item.description,
        isPrimary: item.isMain,
        active: item.isActive,
        sortOrder: item.sortOrder ?? index,
      };

      if (existing) {
        await this.prisma.packageImage.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await this.prisma.packageImage.create({
          data: { ...payload, url: item.url, packageId: ownerId },
        });
      }
    }

    const main = active.find((item) => item.isMain);
    if (main) {
      await this.prisma.packageImage.updateMany({
        where: { packageId: ownerId, url: { not: main.url } },
        data: { isPrimary: false },
      });
    }
  }

  private async deactivateRemovedPropertyImages(ownerId: number, active: any[]) {
    const urls = active.map((item) => item.url).filter(Boolean);
    await this.prisma.propertyImage.updateMany({
      where: {
        propertyId: ownerId,
        ...(urls.length ? { url: { notIn: urls } } : {}),
      },
      data: { active: false, isPrimary: false },
    });
  }

  private async deactivateRemovedExperienceImages(ownerId: number, active: any[]) {
    const urls = active.map((item) => item.url).filter(Boolean);
    await this.prisma.experienceImage.updateMany({
      where: {
        experienceId: ownerId,
        ...(urls.length ? { url: { notIn: urls } } : {}),
      },
      data: { active: false, isPrimary: false },
    });
  }

  private async deactivateRemovedPackageImages(ownerId: number, active: any[]) {
    const urls = active.map((item) => item.url).filter(Boolean);
    await this.prisma.packageImage.updateMany({
      where: {
        packageId: ownerId,
        ...(urls.length ? { url: { notIn: urls } } : {}),
      },
      data: { active: false, isPrimary: false },
    });
  }

  private toGalleryItem(item: any) {
    return {
      type: item.type,
      mediaType: item.type,
      url: item.url,
      title: item.title,
      description: item.description,
      isPrimary: item.isMain,
      isMain: item.isMain,
      active: item.isActive,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      provider: item.provider,
      thumbnailUrl: item.thumbnailUrl,
    };
  }

  private async findExisting(id: number) {
    const media = await this.prisma.contentMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Multimedia no encontrada");
    return media;
  }

  private assertOwner(ownerType?: MediaOwnerType, ownerId?: number) {
    if (!ownerType || !Object.values(MediaOwnerType).includes(ownerType)) {
      throw new BadRequestException("Tipo de propietario multimedia invalido");
    }

    if (!Number.isInteger(Number(ownerId)) || Number(ownerId) <= 0) {
      throw new BadRequestException("ID de propietario multimedia invalido");
    }
  }

  private isAllowedImageUrl(parsed: URL) {
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return (
      /\.(jpe?g|png|webp|avif)(\?.*)?$/.test(path) ||
      CDN_IMAGE_HOST_PARTS.some((part) => host.includes(part))
    );
  }

  private isAllowedVideoUrl(parsed: URL) {
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("vimeo.com") ||
      /\.(mp4|webm|mov)(\?.*)?$/.test(path)
    );
  }

  private isPrivateHost(hostname: string) {
    const host = hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "::1" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  private extractYoutubeId(parsed: URL) {
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    return (
      parsed.searchParams.get("v") ||
      parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/)?.[2] ||
      null
    );
  }

  private extractVimeoId(parsed: URL) {
    return parsed.pathname.match(/\/(\d+)/)?.[1] || null;
  }

  private cleanText(value?: string | null) {
    const text = String(value || "")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
      .trim();

    return text || null;
  }

  private record(
    actor: AuditActor | undefined,
    action: string,
    mediaId: number | undefined,
    ownerType: MediaOwnerType,
    ownerId: number,
    metadata?: Record<string, unknown>
  ) {
    return this.audit.record({
      actor,
      action,
      entityType: "ContentMedia",
      entityId: mediaId || ownerId,
      message: `Evento multimedia ${action}`,
      metadata: {
        ownerType,
        ownerId,
        mediaId,
        ...metadata,
      },
    });
  }
}
