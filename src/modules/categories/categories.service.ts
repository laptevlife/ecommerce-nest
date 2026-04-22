import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateCategoryDto, actorUserId?: string) {
    const exists = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (exists) {
      throw new ConflictException('Category slug already exists');
    }

    const category = await this.prisma.category.create({ data: dto });
    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.CREATE,
      entityType: 'category',
      entityId: category.id,
      description: `Created category ${category.name}`,
    });
    return category;
  }

  async findAll(query?: QueryCategoriesDto) {
    const { page = 1, limit = 20, search, isActive } = query ?? {};
    const where: Prisma.CategoryWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, actorUserId?: string) {
    await this.findOne(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: 'category',
      entityId: category.id,
      description: `Updated category ${category.name}`,
      metadata: dto,
    });
    return category;
  }

  async remove(id: string, actorUserId?: string) {
    const category = await this.findOne(id);
    await this.prisma.category.delete({
      where: { id },
    });
    await this.auditLogsService.create({
      actorUserId,
      action: AuditAction.DELETE,
      entityType: 'category',
      entityId: id,
      description: `Deleted category ${category.name}`,
    });

    return { success: true };
  }
}
