import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductMediaDto } from './dto/create-product-media.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateProductDto, actorUserId?: string) {
    const [bySlug, bySku] = await Promise.all([
      this.prisma.product.findUnique({ where: { slug: dto.slug } }),
      this.prisma.product.findUnique({ where: { sku: dto.sku } }),
    ]);

    if (bySlug) {
      throw new ConflictException('Product slug already exists');
    }

    if (bySku) {
      throw new ConflictException('Product sku already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        price: new Prisma.Decimal(dto.price),
      },
      include: { category: true, media: true, variants: true },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'product',
      entityId: product.id,
      description: `Created product ${product.name}`,
      metadata: { sku: product.sku },
    });

    return this.mapProduct(product);
  }

  async findAll(query: QueryProductsDto) {
    const { page = 1, limit = 20, search, categoryId, status, brand, isPublished } = query;
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: true, media: { orderBy: { sortOrder: 'asc' } }, variants: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map((item) => this.mapProduct(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        media: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapProduct(product);
  }

  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
      },
      include: { category: true, media: true, variants: true },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'product',
      entityId: id,
      description: `Updated product ${product.name}`,
      metadata: dto,
    });

    return this.mapProduct(product);
  }

  async remove(id: string, actorUserId?: string) {
    const product = await this.findOne(id);
    await this.prisma.product.delete({
      where: { id },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'product',
      entityId: id,
      description: `Deleted product ${product.name}`,
    });

    return { success: true };
  }

  async addMedia(productId: string, dto: CreateProductMediaDto, actorUserId?: string) {
    await this.findOne(productId);
    if (dto.isPrimary) {
      await this.prisma.productMedia.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const media = await this.prisma.productMedia.create({
      data: {
        productId,
        url: dto.url,
        alt: dto.alt,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'product_media',
      entityId: media.id,
      description: `Added media to product ${productId}`,
    });

    return media;
  }

  async addVariant(productId: string, dto: CreateProductVariantDto, actorUserId?: string) {
    await this.findOne(productId);
    const skuExists = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });

    if (skuExists) {
      throw new ConflictException('Variant sku already exists');
    }

    if (dto.isDefault) {
      await this.prisma.productVariant.updateMany({
        where: { productId },
        data: { isDefault: false },
      });
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        sku: dto.sku,
        attributesJson: dto.attributesJson,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'product_variant',
      entityId: variant.id,
      description: `Added variant ${variant.sku} to product ${productId}`,
    });

    return {
      ...variant,
      price: Number(variant.price),
    };
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    actorUserId?: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (dto.isDefault) {
      await this.prisma.productVariant.updateMany({
        where: { productId },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...dto,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
      },
    });

    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'product_variant',
      entityId: updated.id,
      description: `Updated variant ${updated.sku}`,
      metadata: dto,
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  private mapProduct(product: any) {
    return {
      ...product,
      price: Number(product.price),
      media: product.media?.map((item: any) => item) ?? [],
      variants:
        product.variants?.map((variant: any) => ({
          ...variant,
          price: Number(variant.price),
          attributes: variant.attributesJson ? JSON.parse(variant.attributesJson) : null,
        })) ?? [],
    };
  }
}
